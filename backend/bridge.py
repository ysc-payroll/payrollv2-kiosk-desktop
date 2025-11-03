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
                log_id, emp_id, action, timestamp, photo_path, synced = log
                logs_list.append({
                    "id": log_id,
                    "employee_id": emp_id,
                    "action": action,
                    "timestamp": timestamp,
                    "photo_path": photo_path,
                    "synced": bool(synced)
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
