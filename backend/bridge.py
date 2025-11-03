"""
Python-JavaScript bridge using PyQt6 QWebChannel.
Exposes Python methods to the Vue.js frontend.
"""
import base64
import os
from datetime import datetime
from pathlib import Path
from PyQt6.QtCore import QObject, pyqtSlot
from database import Database


class KioskBridge(QObject):
    """Bridge between Vue.js frontend and Python backend."""

    def __init__(self):
        super().__init__()
        self.db = Database()

    @pyqtSlot(str, str, str, result=str)
    def logTimeEntry(self, employee_id, action, photo_base64):
        """
        Log a time entry with photo.

        Args:
            employee_id (str): Employee ID
            action (str): "IN" or "OUT"
            photo_base64 (str): Base64 encoded photo data (data:image/png;base64,...)

        Returns:
            str: JSON string with result {"success": bool, "message": str}
        """
        import json

        try:
            # Save photo if provided
            photo_path = None
            if photo_base64 and photo_base64.startswith("data:image"):
                photo_path = self._save_photo(employee_id, action, photo_base64)

            # Log to database
            success, message, log_id = self.db.log_time_entry(employee_id, action, photo_path)

            return json.dumps({
                "success": success,
                "message": message,
                "log_id": log_id
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error: {str(e)}",
                "log_id": None
            })

    def _save_photo(self, employee_id, action, photo_base64):
        """
        Save base64 photo to disk.

        Args:
            employee_id (str): Employee ID
            action (str): "IN" or "OUT"
            photo_base64 (str): Base64 encoded image

        Returns:
            str: Relative path to saved photo
        """
        # Remove data URL prefix
        if "base64," in photo_base64:
            photo_base64 = photo_base64.split("base64,")[1]

        # Decode base64
        photo_bytes = base64.b64decode(photo_base64)

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{employee_id}_{action}_{timestamp}.png"

        # Save to photos directory
        photos_dir = Path("database/photos")
        photos_dir.mkdir(parents=True, exist_ok=True)

        photo_path = photos_dir / filename
        with open(photo_path, "wb") as f:
            f.write(photo_bytes)

        # Return relative path
        return str(photo_path)

    @pyqtSlot(result=str)
    def testConnection(self):
        """Test if bridge is working."""
        import json
        return json.dumps({
            "success": True,
            "message": "Bridge connection successful"
        })

    @pyqtSlot(int, result=str)
    def getRecentLogs(self, limit=20):
        """
        Get recent timesheet logs.

        Args:
            limit (int): Number of records to return (default: 20)

        Returns:
            str: JSON string with logs array
        """
        import json

        try:
            logs = self.db.get_recent_logs(limit)

            # Convert to list of dictionaries
            logs_list = []
            for log in logs:
                log_id, emp_id, emp_code, emp_name, action, timestamp, photo_path, synced, status, error_message = log
                logs_list.append({
                    "id": log_id,
                    "employee_id": emp_id,
                    "employee_code": emp_code,
                    "employee_name": emp_name,
                    "action": action,
                    "timestamp": timestamp,
                    "photo_path": photo_path,
                    "synced": bool(synced),
                    "status": status,
                    "error_message": error_message
                })

            return json.dumps({
                "success": True,
                "logs": logs_list
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "logs": [],
                "error": str(e)
            })

    @pyqtSlot(str, str, result=str)
    def getLogsByDateRange(self, date_from, date_to):
        """
        Get timesheet logs filtered by date range.

        Args:
            date_from (str): Start date in YYYY-MM-DD format
            date_to (str): End date in YYYY-MM-DD format

        Returns:
            str: JSON string with logs array
        """
        import json

        try:
            logs = self.db.get_logs_by_date_range(date_from, date_to)

            # Convert to list of dictionaries
            logs_list = []
            for log in logs:
                log_id, emp_id, emp_code, emp_name, action, timestamp, photo_path, synced, status, error_message = log
                logs_list.append({
                    "id": log_id,
                    "employee_id": emp_id,
                    "employee_code": emp_code,
                    "employee_name": emp_name,
                    "action": action,
                    "timestamp": timestamp,
                    "photo_path": photo_path,
                    "synced": bool(synced),
                    "status": status,
                    "error_message": error_message
                })

            return json.dumps({
                "success": True,
                "logs": logs_list
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "logs": [],
                "error": str(e)
            })

    @pyqtSlot(int, result=str)
    def getEmployeeByNumber(self, employee_number):
        """
        Get employee by employee_number.

        Args:
            employee_number (int): Employee number

        Returns:
            str: JSON string with employee data
        """
        import json

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, backend_id, name, employee_code, employee_number
                FROM employee
                WHERE employee_number = ?
                LIMIT 1
            """, (employee_number,))

            row = cursor.fetchone()
            conn.close()

            if row:
                employee_id, backend_id, name, emp_code, emp_number = row
                return json.dumps({
                    "success": True,
                    "employee": {
                        "id": employee_id,
                        "backend_id": backend_id,
                        "name": name,
                        "employee_code": emp_code,
                        "employee_number": emp_number
                    }
                })
            else:
                return json.dumps({
                    "success": True,
                    "employee": None
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "employee": None,
                "error": str(e)
            })

    @pyqtSlot(result=str)
    def getCurrentCompany(self):
        """
        Get current company information.

        Returns:
            str: JSON string with company data
        """
        import json

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            # Get the first company (in the future, this could be configurable)
            cursor.execute("""
                SELECT id, backend_id, name
                FROM company
                LIMIT 1
            """)

            row = cursor.fetchone()
            conn.close()

            if row:
                company_id, backend_id, name = row
                return json.dumps({
                    "success": True,
                    "company": {
                        "id": company_id,
                        "backend_id": backend_id,
                        "name": name
                    }
                })
            else:
                return json.dumps({
                    "success": True,
                    "company": None
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "company": None,
                "error": str(e)
            })

    @pyqtSlot(str, str, bool, result=str)
    def authenticateUser(self, email, password, remember_me):
        """
        Authenticate user with email and password.

        Args:
            email (str): User email
            password (str): User password (will be hashed)
            remember_me (bool): Whether to remember the user

        Returns:
            str: JSON string with authentication result
        """
        import json
        import hashlib

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            # Hash the password (simple SHA256 for now - in production use bcrypt or similar)
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            # Check if users table exists, if not create it
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            """)

            # Try to find user with matching email and password
            cursor.execute("""
                SELECT id, email, name, role, is_active
                FROM users
                WHERE email = ? AND password_hash = ? AND is_active = 1
            """, (email, password_hash))

            user = cursor.fetchone()

            if user:
                user_id, user_email, name, role, is_active = user

                # Update last login timestamp
                cursor.execute("""
                    UPDATE users
                    SET last_login = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (user_id,))
                conn.commit()

                conn.close()

                return json.dumps({
                    "success": True,
                    "user": {
                        "id": user_id,
                        "email": user_email,
                        "name": name,
                        "role": role
                    }
                })
            else:
                conn.close()
                return json.dumps({
                    "success": False,
                    "error": "Invalid email or password"
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })

    @pyqtSlot(str, str, str, result=str)
    def createUser(self, email, password, name):
        """
        Create a new user account.

        Args:
            email (str): User email
            password (str): User password
            name (str): User full name

        Returns:
            str: JSON string with creation result
        """
        import json
        import hashlib

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            # Hash the password
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            # Create users table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            """)

            # Insert new user
            cursor.execute("""
                INSERT INTO users (email, password_hash, name, role)
                VALUES (?, ?, ?, 'admin')
            """, (email, password_hash, name))

            conn.commit()
            user_id = cursor.lastrowid
            conn.close()

            return json.dumps({
                "success": True,
                "user": {
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "role": "admin"
                }
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })
