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
        """Initialize database schema - tables are created via create_schema.py."""
        # Schema is managed by create_schema.py
        # This method kept for compatibility
        pass

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
        """Get recent log entries with employee details."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT t.id, t.employee_id, e.employee_code, e.name, t.log_type,
                   t.date || ' ' || t.time as timestamp, t.photo_path, t.is_synced,
                   t.status, t.error_message
            FROM timesheet t
            LEFT JOIN employee e ON t.employee_id = e.id
            ORDER BY t.date || ' ' || t.time DESC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_logs_by_date_range(self, date_from, date_to):
        """Get log entries filtered by date range with employee details."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT t.id, t.employee_id, e.employee_code, e.name, t.log_type,
                   t.date || ' ' || t.time as timestamp, t.photo_path, t.is_synced,
                   t.status, t.error_message
            FROM timesheet t
            LEFT JOIN employee e ON t.employee_id = e.id
            WHERE t.date >= ? AND t.date <= ?
            ORDER BY t.date || ' ' || t.time DESC
        """, (date_from, date_to))

        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_unsynced_logs(self):
        """Get all timesheet logs that haven't been synced."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT t.id, t.employee_id, e.employee_code, e.name, t.log_type,
                   t.date, t.time, t.photo_path, t.sync_id
            FROM timesheet t
            LEFT JOIN employee e ON t.employee_id = e.id
            WHERE t.is_synced = 0 AND t.status = 'success'
            ORDER BY t.date ASC, t.time ASC
        """)

        rows = cursor.fetchall()
        conn.close()

        return rows

    def mark_as_synced(self, log_id):
        """Mark a timesheet entry as synced."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE timesheet
            SET is_synced = 1
            WHERE id = ?
        """, (log_id,))

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
