"""
Database operations for the Kiosk application.
Handles SQLite connection and kiosk_logs table operations.
"""
import sqlite3
import os
from datetime import datetime
from pathlib import Path


class Database:
    def __init__(self, db_path="database/kiosk.db"):
        """Initialize database connection and ensure schema exists."""
        self.db_path = db_path

        # Ensure database directory exists
        db_dir = Path(db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        # Ensure photos directory exists
        photos_dir = db_dir / "photos"
        photos_dir.mkdir(parents=True, exist_ok=True)

        self.init_schema()

    def get_connection(self):
        """Get a database connection."""
        return sqlite3.connect(self.db_path)

    def init_schema(self):
        """Initialize database schema - auto-create tables if they don't exist."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Check if tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = {row[0] for row in cursor.fetchall()}

            # If no tables exist or missing critical tables, create schema
            required_tables = {'company', 'employee', 'timesheet', 'users'}
            if not required_tables.issubset(existing_tables):
                print("📋 Creating database tables...")
                self._create_schema(cursor)
                self._add_face_recognition_fields(cursor)
                self._add_timesheet_sync_fields(cursor)
                conn.commit()
                print("✅ Database schema initialized")
            else:
                # Ensure new columns exist even for existing databases
                self._add_face_recognition_fields(cursor)
                self._add_timesheet_sync_fields(cursor)
                conn.commit()

            conn.close()
        except Exception as e:
            print(f"Error initializing schema: {e}")

    def _create_schema(self, cursor):
        """Create all database tables."""
        # Company table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backend_id INTEGER UNIQUE,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_backend_id ON company(backend_id)")

        # Employee table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employee (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backend_id INTEGER UNIQUE,
                name TEXT NOT NULL,
                employee_code TEXT,
                employee_number INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_employee_backend_id ON employee(backend_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_employee_code ON employee(employee_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_employee_deleted_at ON employee(deleted_at)")

        # Timesheet table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS timesheet (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_id TEXT UNIQUE NOT NULL,
                employee_id INTEGER NOT NULL,
                log_type TEXT NOT NULL CHECK(log_type IN ('in', 'out')),
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                photo_path TEXT,
                is_synced BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'success',
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employee(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timesheet_sync_id ON timesheet(sync_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timesheet_employee_id ON timesheet(employee_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timesheet_date ON timesheet(date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timesheet_is_synced ON timesheet(is_synced)")

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                email TEXT NOT NULL,
                name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

    def _add_face_recognition_fields(self, cursor):
        """Add face recognition fields to employee table if they don't exist."""
        # Check existing columns
        cursor.execute("PRAGMA table_info(employee)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        # Add missing face recognition columns
        if 'face_encoding' not in existing_columns:
            cursor.execute("ALTER TABLE employee ADD COLUMN face_encoding TEXT")
        if 'face_photo_path' not in existing_columns:
            cursor.execute("ALTER TABLE employee ADD COLUMN face_photo_path TEXT")
        if 'face_registered_at' not in existing_columns:
            cursor.execute("ALTER TABLE employee ADD COLUMN face_registered_at DATETIME")
        if 'has_face_registration' not in existing_columns:
            cursor.execute("ALTER TABLE employee ADD COLUMN has_face_registration BOOLEAN DEFAULT 0")

    def _add_timesheet_sync_fields(self, cursor):
        """Add backend sync fields to timesheet table if they don't exist."""
        # Check existing columns
        cursor.execute("PRAGMA table_info(timesheet)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        # Add missing sync columns
        if 'backend_timesheet_id' not in existing_columns:
            cursor.execute("ALTER TABLE timesheet ADD COLUMN backend_timesheet_id INTEGER")
        if 'synced_at' not in existing_columns:
            cursor.execute("ALTER TABLE timesheet ADD COLUMN synced_at DATETIME")
        if 'sync_error_message' not in existing_columns:
            cursor.execute("ALTER TABLE timesheet ADD COLUMN sync_error_message TEXT")

        # Create index for backend_timesheet_id if it doesn't exist
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='index' AND name='idx_timesheet_backend_id'
        """)
        if not cursor.fetchone():
            cursor.execute("CREATE INDEX idx_timesheet_backend_id ON timesheet(backend_timesheet_id)")

    def reset_database(self):
        """Drop all tables and recreate schema."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Drop all tables
            cursor.execute("DROP TABLE IF EXISTS timesheet")
            cursor.execute("DROP TABLE IF EXISTS employee")
            cursor.execute("DROP TABLE IF EXISTS company")
            cursor.execute("DROP TABLE IF EXISTS users")

            # Recreate schema
            self._create_schema(cursor)
            self._add_face_recognition_fields(cursor)
            self._add_timesheet_sync_fields(cursor)

            conn.commit()
            conn.close()
            return True, "Database reset successfully"
        except Exception as e:
            return False, f"Error resetting database: {str(e)}"

    def log_time_entry(self, employee_id, action, photo_path=None):
        """
        Insert a time log entry into the timesheet table.

        Args:
            employee_id (str): Employee number (will be looked up)
            action (str): "IN" or "OUT"
            photo_path (str, optional): Path to captured photo

        Returns:
            tuple: (success: bool, message: str, log_id: int or None)
        """
        if not employee_id or not employee_id.strip():
            return False, "Employee ID is required", None

        if action not in ["IN", "OUT"]:
            return False, "Action must be 'IN' or 'OUT'", None

        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Look up employee by employee_number to get database ID (exclude soft-deleted)
            employee_number = int(employee_id.strip())
            cursor.execute("""
                SELECT id FROM employee WHERE employee_number = ? AND deleted_at IS NULL
            """, (employee_number,))

            employee_row = cursor.fetchone()
            if not employee_row:
                conn.close()
                return False, f"Employee {employee_number} not found", None

            db_employee_id = employee_row[0]

            # Get current timestamp
            now = datetime.now()
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M")
            timestamp_str = now.strftime("%Y%m%d%H%M%S")

            # Generate sync_id (format: company_id_employee_id_timestamp)
            # For now, use 1001 as default company_id
            sync_id = f"1001_{db_employee_id}_{timestamp_str}"

            # Convert action to lowercase for log_type
            log_type = action.lower()

            # Insert into new timesheet table
            cursor.execute("""
                INSERT INTO timesheet (
                    sync_id, employee_id, log_type, date, time,
                    photo_path, is_synced, status
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, 'success')
            """, (sync_id, db_employee_id, log_type, date_str, time_str, photo_path))

            log_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return True, f"Successfully clocked {action}", log_id

        except ValueError:
            return False, "Invalid employee number format", None
        except Exception as e:
            # Log error to database
            try:
                conn = self.get_connection()
                cursor = conn.cursor()

                # Try to get employee_id for error logging
                try:
                    employee_number = int(employee_id.strip())
                    cursor.execute("SELECT id FROM employee WHERE employee_number = ? AND deleted_at IS NULL", (employee_number,))
                    employee_row = cursor.fetchone()
                    if employee_row:
                        db_employee_id = employee_row[0]
                        now = datetime.now()
                        date_str = now.strftime("%Y-%m-%d")
                        time_str = now.strftime("%H:%M")
                        timestamp_str = now.strftime("%Y%m%d%H%M%S")
                        sync_id = f"1001_{db_employee_id}_{timestamp_str}"
                        log_type = action.lower()

                        # Insert error entry
                        cursor.execute("""
                            INSERT INTO timesheet (
                                sync_id, employee_id, log_type, date, time,
                                photo_path, is_synced, status, error_message
                            )
                            VALUES (?, ?, ?, ?, ?, ?, 0, 'error', ?)
                        """, (sync_id, db_employee_id, log_type, date_str, time_str, photo_path, str(e)))
                        conn.commit()
                except:
                    pass

                conn.close()
            except:
                pass

            return False, f"Database error: {str(e)}", None

    def get_recent_logs(self, limit=10):
        """Get recent log entries with employee details and sync status."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT t.id, t.employee_id, e.employee_code, e.employee_number, e.name, e.backend_id, t.log_type,
                   t.date || ' ' || t.time as timestamp, t.photo_path,
                   t.backend_timesheet_id, t.status, t.error_message, t.sync_error_message
            FROM timesheet t
            LEFT JOIN employee e ON t.employee_id = e.id
            ORDER BY t.date || ' ' || t.time DESC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_logs_by_date_range(self, date_from, date_to):
        """Get log entries filtered by date range with employee details and sync status."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT t.id, t.employee_id, e.employee_code, e.employee_number, e.name, e.backend_id, t.log_type,
                   t.date || ' ' || t.time as timestamp, t.photo_path,
                   t.backend_timesheet_id, t.status, t.error_message, t.sync_error_message
            FROM timesheet t
            LEFT JOIN employee e ON t.employee_id = e.id
            WHERE t.date >= ? AND t.date <= ?
            ORDER BY t.date || ' ' || t.time DESC
        """, (date_from, date_to))

        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_unsynced_logs(self):
        """
        Get all timesheet logs that haven't been synced.
        A log is unsynced if backend_timesheet_id is NULL and status is 'success'.

        Returns:
            list: List of tuples (id, employee_id, employee_backend_id, employee_code,
                  name, log_type, date, time, photo_path, sync_id)
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT t.id, t.employee_id, e.backend_id, e.employee_code, e.name, t.log_type,
                   t.date, t.time, t.photo_path, t.sync_id
            FROM timesheet t
            LEFT JOIN employee e ON t.employee_id = e.id
            WHERE t.backend_timesheet_id IS NULL AND t.status = 'success'
            ORDER BY t.date ASC, t.time ASC
        """)

        rows = cursor.fetchall()
        conn.close()

        return rows

    def mark_as_synced(self, log_id, backend_timesheet_id=None):
        """
        Mark a timesheet entry as synced by storing the backend ID.
        Sync status is determined by backend_timesheet_id IS NOT NULL.

        Args:
            log_id (int): Local database ID of timesheet entry
            backend_timesheet_id (int): Backend ID from API response (required)
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # backend_timesheet_id is the indicator of sync status
        # If it's NULL, timesheet is not synced; if it has a value, it's synced
        cursor.execute("""
            UPDATE timesheet
            SET backend_timesheet_id = ?,
                synced_at = ?,
                sync_error_message = NULL
            WHERE id = ?
        """, (backend_timesheet_id, datetime.now(), log_id))

        conn.commit()
        conn.close()

    def mark_sync_failed(self, log_id, error_message):
        """
        Mark a timesheet entry sync as failed.
        Keeps backend_timesheet_id as NULL (indicating not synced) and stores error message.

        Args:
            log_id (int): Local database ID of timesheet entry
            error_message (str): Error message from sync attempt
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE timesheet
            SET sync_error_message = ?,
                backend_timesheet_id = NULL
            WHERE id = ?
        """, (error_message, log_id))

        conn.commit()
        conn.close()

    def get_employees_timekeeper(self):
        """
        Get all active employees (not soft-deleted) for timekeeper display.

        Returns:
            list: List of tuples (backend_id, name, employee_number)
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT backend_id, name, employee_number
            FROM employee
            WHERE deleted_at IS NULL
            ORDER BY name ASC
        """)

        rows = cursor.fetchall()
        conn.close()
        return rows

    def check_employee_has_applications(self, backend_id):
        """
        Check if an employee has any overtime, leave, or timesheet records.

        Args:
            backend_id (int): Employee's backend_id

        Returns:
            tuple: (has_records: bool, record_types: list)
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # First get the local employee id
        cursor.execute("SELECT id FROM employee WHERE backend_id = ?", (backend_id,))
        employee_row = cursor.fetchone()

        if not employee_row:
            conn.close()
            return False, []

        employee_id = employee_row[0]
        record_types = []

        # Check timesheet records
        cursor.execute("""
            SELECT COUNT(*) FROM timesheet WHERE employee_id = ?
        """, (employee_id,))
        timesheet_count = cursor.fetchone()[0]
        if timesheet_count > 0:
            record_types.append(f"timesheet ({timesheet_count})")

        # TODO: Check overtime applications when the table exists
        # cursor.execute("""
        #     SELECT COUNT(*) FROM overtime_application WHERE employee_id = ?
        # """, (employee_id,))
        # overtime_count = cursor.fetchone()[0]
        # if overtime_count > 0:
        #     record_types.append(f"overtime ({overtime_count})")

        # TODO: Check leave applications when the table exists
        # cursor.execute("""
        #     SELECT COUNT(*) FROM leave_application WHERE employee_id = ?
        # """, (employee_id,))
        # leave_count = cursor.fetchone()[0]
        # if leave_count > 0:
        #     record_types.append(f"leave ({leave_count})")

        conn.close()

        has_records = len(record_types) > 0
        return has_records, record_types

    def save_face_encoding(self, employee_id, face_encoding_json, photo_path):
        """
        Save face encoding for an employee.

        Args:
            employee_id (int): Database ID of employee
            face_encoding_json (str): JSON-serialized face encoding array
            photo_path (str): Path to reference photo

        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Update employee record with face data
            cursor.execute("""
                UPDATE employee
                SET face_encoding = ?,
                    face_photo_path = ?,
                    face_registered_at = ?,
                    has_face_registration = 1
                WHERE id = ?
            """, (face_encoding_json, photo_path, datetime.now(), employee_id))

            if cursor.rowcount == 0:
                conn.close()
                return False, "Employee not found"

            conn.commit()
            conn.close()
            return True, "Face encoding saved successfully"

        except Exception as e:
            return False, f"Error saving face encoding: {str(e)}"

    def get_face_encoding(self, employee_id):
        """
        Get face encoding for an employee.

        Args:
            employee_id (int): Database ID of employee

        Returns:
            tuple: (success: bool, face_encoding_json: str or None, photo_path: str or None)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT face_encoding, face_photo_path
                FROM employee
                WHERE id = ? AND has_face_registration = 1 AND deleted_at IS NULL
            """, (employee_id,))

            row = cursor.fetchone()
            conn.close()

            if row and row[0]:
                return True, row[0], row[1]
            else:
                return False, None, None

        except Exception as e:
            return False, None, None

    def get_all_face_encodings(self):
        """
        Get all face encodings for active employees.

        Returns:
            list: List of tuples (employee_id, name, face_encoding_json)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, name, face_encoding, employee_number
                FROM employee
                WHERE has_face_registration = 1
                  AND face_encoding IS NOT NULL
                  AND deleted_at IS NULL
            """)

            rows = cursor.fetchall()
            conn.close()
            return rows

        except Exception as e:
            print(f"Error getting face encodings: {str(e)}")
            return []

    def delete_face_encoding(self, employee_id):
        """
        Delete face encoding for an employee.

        Args:
            employee_id (int): Database ID of employee

        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Clear face data
            cursor.execute("""
                UPDATE employee
                SET face_encoding = NULL,
                    face_photo_path = NULL,
                    face_registered_at = NULL,
                    has_face_registration = 0
                WHERE id = ?
            """, (employee_id,))

            if cursor.rowcount == 0:
                conn.close()
                return False, "Employee not found"

            conn.commit()
            conn.close()
            return True, "Face encoding deleted successfully"

        except Exception as e:
            return False, f"Error deleting face encoding: {str(e)}"

    def get_face_registration_status(self, employee_id):
        """
        Check if employee has face registration.

        Args:
            employee_id (int): Database ID of employee

        Returns:
            tuple: (has_registration: bool, registered_at: str or None)
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT has_face_registration, face_registered_at
                FROM employee
                WHERE id = ? AND deleted_at IS NULL
            """, (employee_id,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return bool(row[0]), row[1]
            else:
                return False, None

        except Exception as e:
            return False, None
