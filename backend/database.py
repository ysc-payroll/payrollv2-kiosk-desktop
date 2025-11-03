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
        """Create kiosk_logs table if it doesn't exist."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS kiosk_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                photo_path TEXT,
                synced BOOLEAN DEFAULT 0
            )
        """)

        # Create index for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_employee_id ON kiosk_logs(employee_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_synced ON kiosk_logs(synced)
        """)

        conn.commit()
        conn.close()

    def log_time_entry(self, employee_id, action, photo_path=None):
        """
        Insert a time log entry.

        Args:
            employee_id (str): Employee ID
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

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute("""
                INSERT INTO kiosk_logs (employee_id, action, timestamp, photo_path, synced)
                VALUES (?, ?, ?, ?, 0)
            """, (employee_id.strip(), action, timestamp, photo_path))

            log_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return True, f"Successfully clocked {action}", log_id

        except Exception as e:
            return False, f"Database error: {str(e)}", None

    def get_recent_logs(self, limit=10):
        """Get recent log entries (for Phase 2)."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, employee_id, action, timestamp, photo_path, synced
            FROM kiosk_logs
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        return rows

    def get_unsynced_logs(self):
        """Get all logs that haven't been synced (for Phase 3)."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, employee_id, action, timestamp, photo_path
            FROM kiosk_logs
            WHERE synced = 0
            ORDER BY timestamp ASC
        """)

        rows = cursor.fetchall()
        conn.close()

        return rows

    def mark_as_synced(self, log_id):
        """Mark a log entry as synced (for Phase 3)."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE kiosk_logs
            SET synced = 1
            WHERE id = ?
        """, (log_id,))

        conn.commit()
        conn.close()
