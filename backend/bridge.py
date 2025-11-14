"""
Python-JavaScript bridge using PyQt6 QWebChannel.
Exposes Python methods to the Vue.js frontend.
"""
import base64
import os
from datetime import datetime
from pathlib import Path
from PyQt6.QtCore import QObject, pyqtSlot, pyqtSignal, QTimer
from PyQt6.QtWidgets import QFileDialog
from database import Database, get_app_data_dir


class KioskBridge(QObject):
    """Bridge between Vue.js frontend and Python backend."""

    # Signals for progress updates
    populateProgressUpdate = pyqtSignal(str)  # Emits JSON with progress info

    def __init__(self, parent=None):
        super().__init__()
        self.db = Database()
        self.parent = parent  # Store parent widget for file dialogs
        # Cache for face encodings to avoid repeated DB queries
        self._face_encodings_cache = None
        self._cache_timestamp = None
        self._cache_ttl_seconds = 300  # Cache expires after 5 minutes
        # Batch processing state
        self._populate_timer = None
        self._populate_state = None

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

        # Save to photos directory in app data dir
        data_dir = get_app_data_dir()
        photos_dir = data_dir / "photos"
        photos_dir.mkdir(parents=True, exist_ok=True)

        photo_path = photos_dir / filename
        with open(photo_path, "wb") as f:
            f.write(photo_bytes)

        # Return relative path
        return str(photo_path)

    def _get_cached_face_encodings(self):
        """
        Get face encodings from cache or database.
        Refreshes cache every 5 minutes to balance performance and data freshness.

        Returns:
            list: Tuples of (id, name, face_encoding_json, employee_number)
        """
        from datetime import datetime, timedelta

        now = datetime.now()

        # Check if cache is empty or expired
        if (self._face_encodings_cache is None or
            self._cache_timestamp is None or
            (now - self._cache_timestamp).total_seconds() > self._cache_ttl_seconds):

            # Refresh cache from database
            self._face_encodings_cache = self.db.get_all_face_encodings()
            self._cache_timestamp = now

            import sys
            sys.stderr.write(f"🔄 Face encodings cache refreshed ({len(self._face_encodings_cache)} employees)\n")
            sys.stderr.flush()

        return self._face_encodings_cache

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
                (log_id, emp_id, emp_code, emp_number, emp_name, emp_backend_id, action, timestamp, photo_path,
                 backend_timesheet_id, status, error_message, sync_error_message) = log
                logs_list.append({
                    "id": log_id,
                    "employee_id": emp_id,
                    "employee_code": emp_code,
                    "employee_number": emp_number,
                    "employee_name": emp_name,
                    "employee_backend_id": emp_backend_id,  # Backend employee ID for API calls
                    "action": action,
                    "timestamp": timestamp,
                    "photo_path": photo_path,
                    "backend_timesheet_id": backend_timesheet_id,
                    "synced": backend_timesheet_id is not None,  # Derived from backend_timesheet_id
                    "status": status,
                    "error_message": error_message,
                    "sync_error_message": sync_error_message
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
                (log_id, emp_id, emp_code, emp_number, emp_name, emp_backend_id, action, timestamp, photo_path,
                 backend_timesheet_id, status, error_message, sync_error_message) = log
                logs_list.append({
                    "id": log_id,
                    "employee_id": emp_id,
                    "employee_code": emp_code,
                    "employee_number": emp_number,
                    "employee_name": emp_name,
                    "employee_backend_id": emp_backend_id,  # Backend employee ID for API calls
                    "action": action,
                    "timestamp": timestamp,
                    "photo_path": photo_path,
                    "backend_timesheet_id": backend_timesheet_id,
                    "synced": backend_timesheet_id is not None,  # Derived from backend_timesheet_id
                    "status": status,
                    "error_message": error_message,
                    "sync_error_message": sync_error_message
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
    @pyqtSlot(result=str)
    def getAllEmployeesFromDatabase(self):
        """
        Get all active employees from local database.

        Returns:
            str: JSON string with array of employee data
        """
        import json

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, backend_id, name, employee_code, employee_number,
                       has_face_registration, face_registered_at
                FROM employee
                WHERE deleted_at IS NULL
                ORDER BY name ASC
            """)

            rows = cursor.fetchall()
            conn.close()

            employees = []
            for row in rows:
                employee_id, backend_id, name, emp_code, emp_number, has_face_reg, face_reg_at = row
                employees.append({
                    "id": backend_id,  # Use backend_id as id for compatibility with frontend
                    "name": name,
                    "employee_code": emp_code,
                    "timekeeper_id": emp_number,
                    "has_face_registration": bool(has_face_reg),
                    "face_registered_at": face_reg_at
                })

            return json.dumps({
                "success": True,
                "data": employees
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e),
                "data": []
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
                WHERE employee_number = ? AND deleted_at IS NULL
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

    @pyqtSlot(result=str)
    def getCurrentUser(self):
        """
        Get the current logged-in user from local database.
        There can only be one user record (id must equal 1).

        Returns:
            str: JSON string with user data or None if not logged in
        """
        import json

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            # Get the single user record
            cursor.execute("""
                SELECT id, email, name, is_active, last_login
                FROM users
                WHERE id = 1 AND is_active = 1
            """)

            user = cursor.fetchone()
            conn.close()

            if user:
                user_id, email, name, is_active, last_login = user
                return json.dumps({
                    "success": True,
                    "user": {
                        "id": user_id,
                        "email": email,
                        "name": name,
                        "is_active": bool(is_active),
                        "last_login": last_login
                    }
                })
            else:
                return json.dumps({
                    "success": True,
                    "user": None
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "user": None,
                "error": str(e)
            })

    @pyqtSlot(str, result=str)
    def updateCompany(self, company_json):
        """
        Update company information in local database from API data.

        Args:
            company_json (str): JSON string containing company data from API

        Returns:
            str: JSON string with update result
        """
        import json

        try:
            company = json.loads(company_json)
            conn = self.db.get_connection()
            cursor = conn.cursor()

            # Extract company data
            company_id = company.get('id')
            company_name = company.get('name', '')
            company_slug = company.get('slug', '')
            address = company.get('address', '')
            contact_number = company.get('contact_number', '')
            email = company.get('email', '')

            # Check if company exists
            cursor.execute("""
                SELECT id FROM company WHERE backend_id = ?
            """, (company_id,))

            existing = cursor.fetchone()

            if existing:
                # Update existing company
                cursor.execute("""
                    UPDATE company
                    SET name = ?
                    WHERE backend_id = ?
                """, (company_name, company_id))
            else:
                # Insert new company
                cursor.execute("""
                    INSERT INTO company (backend_id, name)
                    VALUES (?, ?)
                """, (company_id, company_name))

            conn.commit()
            conn.close()

            return json.dumps({
                "success": True,
                "message": f"Company '{company_name}' updated successfully"
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })

    @pyqtSlot(str, result=str)
    def syncEmployeesFromAPI(self, employees_json):
        """
        Sync employees from API to local database.

        Args:
            employees_json (str): JSON string containing array of employee data from API

        Returns:
            str: JSON string with sync result
        """
        import json

        try:
            employees = json.loads(employees_json)
            conn = self.db.get_connection()
            cursor = conn.cursor()

            synced_count = 0
            skipped_count = 0

            for emp in employees:
                try:
                    # Extract employee data from API response
                    # Try different field names for backend ID
                    system_id = emp.get('id') or emp.get('system_id')

                    # Try different field names for employee number
                    employee_number = emp.get('timekeeper_id') or emp.get('system_id') or emp.get('employee_number')

                    # Try to get name directly, or build it from first/last/middle name
                    full_name = emp.get('name', '').strip()

                    if not full_name:
                        # Fallback: build from individual name fields
                        first_name = emp.get('first_name', '')
                        last_name = emp.get('last_name', '')
                        middle_name = emp.get('middle_name', '')

                        full_name = f"{first_name} {middle_name} {last_name}".strip()
                        if not full_name:
                            full_name = f"{first_name} {last_name}".strip()

                    # Check if employee already exists
                    cursor.execute("""
                        SELECT id FROM employee WHERE backend_id = ?
                    """, (system_id,))

                    existing = cursor.fetchone()

                    if existing:
                        # Update existing employee
                        cursor.execute("""
                            UPDATE employee
                            SET name = ?, employee_number = ?
                            WHERE backend_id = ?
                        """, (full_name, employee_number, system_id))
                    else:
                        # Insert new employee
                        cursor.execute("""
                            INSERT INTO employee (backend_id, name, employee_number)
                            VALUES (?, ?, ?)
                        """, (system_id, full_name, employee_number))

                    synced_count += 1

                except Exception as e:
                    skipped_count += 1
                    continue

            conn.commit()
            conn.close()

            return json.dumps({
                "success": True,
                "synced_count": synced_count,
                "skipped_count": skipped_count,
                "message": f"Successfully synced {synced_count} employees"
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "synced_count": 0,
                "skipped_count": 0,
                "error": str(e)
            })

    @pyqtSlot(str, result=str)
    def syncEmployeesFromAPIWithCleanup(self, employees_json):
        """
        Sync employees from API to local database with cleanup (soft-delete removed employees).
        This method:
        1. Adds new employees
        2. Updates existing employees
        3. Soft-deletes employees not in API (unless they have application records)

        Args:
            employees_json (str): JSON string containing array of employee data from API

        Returns:
            str: JSON string with detailed sync result including:
                - added_count: Number of new employees added
                - updated_count: Number of existing employees updated
                - deleted_count: Number of employees soft-deleted
                - skipped_count: Number of employees skipped (have applications)
                - skipped_details: List of skipped employees with reasons
        """
        import json
        from datetime import datetime

        try:
            employees = json.loads(employees_json)
            conn = self.db.get_connection()
            cursor = conn.cursor()

            added_count = 0
            updated_count = 0
            deleted_count = 0
            skipped_count = 0
            skipped_details = []

            # Start transaction
            cursor.execute("BEGIN TRANSACTION")

            # Step 1 & 2: Add new and update existing employees
            api_backend_ids = []
            face_sync_count = 0

            for emp in employees:
                try:
                    # Extract employee data from API response
                    # API returns: id, timekeeper_id, name, face_encoding, face_registered_at, has_face_registration
                    system_id = emp.get('id')  # Maps to backend_id in database
                    employee_number = emp.get('timekeeper_id')  # Maps to employee_number in database
                    full_name = emp.get('name', '')  # Name is already complete

                    # Extract face data from API (new fields)
                    api_face_encoding = emp.get('face_encoding')  # JSON string or null
                    api_face_registered_at = emp.get('face_registered_at')  # ISO datetime or null
                    has_face_registration = emp.get('has_face_registration', False)

                    # Track API backend IDs
                    api_backend_ids.append(system_id)

                    # Check if employee already exists
                    cursor.execute("""
                        SELECT id, name, employee_number, deleted_at, face_encoding, face_registered_at
                        FROM employee WHERE backend_id = ?
                    """, (system_id,))

                    existing = cursor.fetchone()

                    if existing:
                        emp_id, current_name, current_number, deleted_at, local_face_encoding, local_face_registered_at = existing

                        # Check if data changed or if restoring deleted employee
                        data_changed = (current_name != full_name or current_number != employee_number)
                        is_deleted = deleted_at is not None

                        if data_changed or is_deleted:
                            # Update existing employee (and restore if soft-deleted)
                            cursor.execute("""
                                UPDATE employee
                                SET name = ?, employee_number = ?, deleted_at = NULL
                                WHERE backend_id = ?
                            """, (full_name, employee_number, system_id))
                            updated_count += 1

                        # Handle face encoding sync
                        if has_face_registration and api_face_encoding:
                            # Cloud has face data
                            if not local_face_encoding:
                                # Local doesn't have face data - download from cloud
                                cursor.execute("""
                                    UPDATE employee
                                    SET face_encoding = ?,
                                        face_registered_at = ?,
                                        has_face_registration = 1
                                    WHERE id = ?
                                """, (api_face_encoding, api_face_registered_at, emp_id))
                                face_sync_count += 1
                        elif not has_face_registration and local_face_encoding:
                            # Cloud doesn't have face data but local does - clear local
                            # (Cloud is source of truth)
                            cursor.execute("""
                                UPDATE employee
                                SET face_encoding = NULL,
                                    face_registered_at = NULL,
                                    has_face_registration = 0,
                                    face_photo_path = NULL
                                WHERE id = ?
                            """, (emp_id,))
                            face_sync_count += 1

                    else:
                        # Insert new employee with face data if available
                        if has_face_registration and api_face_encoding:
                            cursor.execute("""
                                INSERT INTO employee (backend_id, name, employee_number,
                                                    face_encoding, face_registered_at, has_face_registration)
                                VALUES (?, ?, ?, ?, ?, 1)
                            """, (system_id, full_name, employee_number, api_face_encoding, api_face_registered_at))
                            face_sync_count += 1
                        else:
                            cursor.execute("""
                                INSERT INTO employee (backend_id, name, employee_number)
                                VALUES (?, ?, ?)
                            """, (system_id, full_name, employee_number))
                        added_count += 1

                except Exception as e:
                    skipped_count += 1
                    skipped_details.append({
                        "backend_id": emp.get('id'),
                        "name": emp.get('name', 'Unknown'),
                        "reason": f"Error: {str(e)}"
                    })
                    continue

            # Step 3: Soft-delete employees not in API list
            # Find employees that are NOT in the API list and NOT already soft-deleted

            if api_backend_ids:
                placeholders = ','.join('?' * len(api_backend_ids))
                cursor.execute(f"""
                    SELECT id, backend_id, name
                    FROM employee
                    WHERE backend_id NOT IN ({placeholders})
                      AND deleted_at IS NULL
                """, api_backend_ids)
            else:
                cursor.execute("""
                    SELECT id, backend_id, name
                    FROM employee
                    WHERE deleted_at IS NULL
                """)

            employees_to_delete = cursor.fetchall()

            for emp_id, backend_id, name in employees_to_delete:

                # Check if employee has application records
                has_records, record_types = self.db.check_employee_has_applications(backend_id)

                if has_records:
                    # Skip deletion if employee has records
                    skipped_count += 1
                    skipped_details.append({
                        "backend_id": backend_id,
                        "name": name,
                        "reason": f"Has records: {', '.join(record_types)}"
                    })
                else:
                    # Soft-delete the employee
                    cursor.execute("""
                        UPDATE employee
                        SET deleted_at = ?
                        WHERE id = ?
                    """, (datetime.now().isoformat(), emp_id))
                    deleted_count += 1

            # Commit transaction
            conn.commit()
            conn.close()

            # Clear face encodings cache after sync
            if face_sync_count > 0:
                self._face_encodings_cache = None
                self._cache_timestamp = None

            return json.dumps({
                "success": True,
                "added_count": added_count,
                "updated_count": updated_count,
                "deleted_count": deleted_count,
                "skipped_count": skipped_count,
                "face_sync_count": face_sync_count,
                "skipped_details": skipped_details,
                "message": f"Sync complete: {added_count} added, {updated_count} updated, {deleted_count} removed, {face_sync_count} faces synced"
            })

        except Exception as e:
            # Rollback on error
            try:
                conn.rollback()
                conn.close()
            except:
                pass

            return json.dumps({
                "success": False,
                "added_count": 0,
                "updated_count": 0,
                "deleted_count": 0,
                "skipped_count": 0,
                "skipped_details": [],
                "error": str(e)
            })

    @pyqtSlot(str, str, result=str)
    def updateCurrentUser(self, email, name):
        """
        Update or create the current user record after successful API login.
        There can only be one user record (id = 1).

        Args:
            email (str): User email
            name (str): User full name

        Returns:
            str: JSON string with update result
        """
        import json

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            # Check if user record exists
            cursor.execute("""
                SELECT id FROM users WHERE id = 1
            """)

            existing = cursor.fetchone()

            if existing:
                # Update existing user record
                cursor.execute("""
                    UPDATE users
                    SET email = ?, name = ?, last_login = CURRENT_TIMESTAMP
                    WHERE id = 1
                """, (email, name))
            else:
                # Insert new user record (must have id = 1)
                cursor.execute("""
                    INSERT INTO users (id, email, name, is_active, last_login)
                    VALUES (1, ?, ?, 1, CURRENT_TIMESTAMP)
                """, (email, name))

            conn.commit()
            conn.close()

            return json.dumps({
                "success": True,
                "message": f"User '{name}' updated successfully"
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })

    @pyqtSlot(str, str, result=str)
    def saveFileDialog(self, content, default_filename):
        """
        Show a save file dialog and save content to the selected file.

        Args:
            content (str): Content to save (CSV data, JSON, etc.)
            default_filename (str): Default filename to suggest

        Returns:
            str: JSON string with result
        """
        import json

        try:
            # Show save file dialog
            file_path, _ = QFileDialog.getSaveFileName(
                self.parent,
                "Save File",
                default_filename,
                "CSV Files (*.csv);;All Files (*)"
            )

            if file_path:
                # Write content to file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

                return json.dumps({
                    "success": True,
                    "message": f"File saved successfully to {file_path}",
                    "file_path": file_path
                })
            else:
                return json.dumps({
                    "success": False,
                    "message": "Save cancelled by user",
                    "cancelled": True
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error saving file: {str(e)}",
                "error": str(e)
            })

    @pyqtSlot(str, result=str)
    def checkFaceQuality(self, photo_base64):
        """
        Check quality of a face photo before registration.
        Validates blur, brightness, face size, centering, and angle.

        Args:
            photo_base64 (str): Base64 encoded photo (data:image/png;base64,...)

        Returns:
            str: JSON string with quality score and issues
        """
        import json
        import numpy as np
        import cv2

        try:
            import face_recognition
        except ImportError as e:
            return json.dumps({
                "success": False,
                "quality_score": 0,
                "message": f"Face recognition library not installed: {str(e)}",
                "issues": []
            })

        try:
            # Remove data URL prefix
            if "base64," in photo_base64:
                photo_base64 = photo_base64.split("base64,")[1]

            # Decode base64
            photo_bytes = base64.b64decode(photo_base64)
            nparr = np.frombuffer(photo_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                return json.dumps({
                    "success": False,
                    "quality_score": 0,
                    "message": "Failed to decode image",
                    "issues": [{"type": "decode", "severity": "error", "message": "Failed to decode image"}]
                })

            # Convert BGR to RGB for face_recognition
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image.shape[:2]

            issues = []
            quality_score = 0

            # 1. Face Detection (mandatory)
            face_locations = face_recognition.face_locations(rgb_image)

            if len(face_locations) == 0:
                return json.dumps({
                    "success": False,
                    "quality_score": 0,
                    "message": "No face detected in photo",
                    "issues": [{"type": "no_face", "severity": "error", "message": "No face detected. Ensure your face is visible and well-lit."}]
                })

            if len(face_locations) > 1:
                return json.dumps({
                    "success": False,
                    "quality_score": 0,
                    "message": "Multiple faces detected",
                    "issues": [{"type": "multiple_faces", "severity": "error", "message": "Multiple faces detected. Ensure only your face is visible."}]
                })

            # Get face bounding box
            top, right, bottom, left = face_locations[0]
            face_width = right - left
            face_height = bottom - top
            face_area = face_width * face_height
            frame_area = width * height
            face_size_ratio = face_area / frame_area

            # 2. Blur Detection (30 points)
            # Adjusted thresholds for typical webcam quality (720p-1080p)
            # Lowered thresholds to be more forgiving for standard webcams
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

            if laplacian_var > 80:
                # Good focus - most webcams should achieve this
                quality_score += 30
            elif laplacian_var > 30:
                # Acceptable focus - still usable for face recognition
                quality_score += 20
                issues.append({"type": "blur", "severity": "warning", "message": "Image is slightly blurry. Hold camera steady."})
            else:
                # Poor focus - but still allow if score >= 70
                quality_score += 10
                issues.append({"type": "blur", "severity": "warning", "message": "Image is blurry. Try holding camera steady or cleaning lens."})

            # 3. Brightness Check (20 points)
            brightness = np.mean(gray)

            if 80 <= brightness <= 180:
                quality_score += 20
            elif 50 <= brightness <= 200:
                quality_score += 10
                if brightness < 80:
                    issues.append({"type": "brightness", "severity": "warning", "message": "Lighting is dim. Move to a brighter area."})
                else:
                    issues.append({"type": "brightness", "severity": "warning", "message": "Lighting is too bright. Avoid direct light on face."})
            else:
                # Even poor lighting can work if other criteria are met
                if brightness < 50:
                    issues.append({"type": "brightness", "severity": "warning", "message": "Too dark. Turn on lights or move to brighter area."})
                else:
                    issues.append({"type": "brightness", "severity": "warning", "message": "Too bright. Reduce direct lighting."})

            # 4. Face Size Check (20 points)
            # More forgiving thresholds - accept smaller faces (further distance)
            if 0.15 <= face_size_ratio <= 0.40:
                # Good range - face is clearly visible
                quality_score += 20
            elif 0.10 <= face_size_ratio <= 0.50:
                # Acceptable range - slightly far or close
                quality_score += 15
                if face_size_ratio < 0.15:
                    issues.append({"type": "distance", "severity": "warning", "message": "Face is small. Move 6 inches closer to camera."})
                else:
                    issues.append({"type": "distance", "severity": "warning", "message": "Face is large. Move back slightly."})
            else:
                # Still usable but not ideal
                quality_score += 5
                if face_size_ratio < 0.10:
                    issues.append({"type": "distance", "severity": "warning", "message": "Too far from camera. Move much closer."})
                else:
                    issues.append({"type": "distance", "severity": "warning", "message": "Too close to camera. Move back."})

            # 5. Face Centering Check (15 points)
            face_center_x = (left + right) / 2
            face_center_y = (top + bottom) / 2
            frame_center_x = width / 2
            frame_center_y = height / 2
            offset_x = abs(face_center_x - frame_center_x) / width
            offset_y = abs(face_center_y - frame_center_y) / height
            max_offset = max(offset_x, offset_y)

            if max_offset < 0.15:
                quality_score += 15
            elif max_offset < 0.25:
                quality_score += 8
                if offset_x > offset_y:
                    direction = "left" if face_center_x < frame_center_x else "right"
                    issues.append({"type": "centering", "severity": "warning", "message": f"Face slightly off-center. Move {direction}."})
                else:
                    direction = "down" if face_center_y < frame_center_y else "up"
                    issues.append({"type": "centering", "severity": "warning", "message": f"Face slightly off-center. Move {direction}."})
            else:
                issues.append({"type": "centering", "severity": "error", "message": "Face not centered. Position yourself in the middle of frame."})

            # 6. Face Angle Check (15 points) using landmarks
            try:
                face_landmarks_list = face_recognition.face_landmarks(rgb_image)
                if face_landmarks_list:
                    landmarks = face_landmarks_list[0]

                    # Calculate nose-to-eye distances (simple frontal face check)
                    left_eye = np.array(landmarks['left_eye'])
                    right_eye = np.array(landmarks['right_eye'])
                    nose_bridge = np.array(landmarks['nose_bridge'])

                    left_eye_center = np.mean(left_eye, axis=0)
                    right_eye_center = np.mean(right_eye, axis=0)
                    nose_tip = nose_bridge[-1]

                    # Calculate eye distance and nose-to-eye distances
                    eye_distance = np.linalg.norm(right_eye_center - left_eye_center)
                    nose_to_left_eye = np.linalg.norm(nose_tip - left_eye_center)
                    nose_to_right_eye = np.linalg.norm(nose_tip - right_eye_center)

                    # Check symmetry (frontal face should be symmetric)
                    symmetry_ratio = min(nose_to_left_eye, nose_to_right_eye) / max(nose_to_left_eye, nose_to_right_eye)

                    if symmetry_ratio > 0.85:
                        quality_score += 15
                    elif symmetry_ratio > 0.70:
                        quality_score += 8
                        if nose_to_left_eye < nose_to_right_eye:
                            issues.append({"type": "angle", "severity": "warning", "message": "Turn your head slightly to the right."})
                        else:
                            issues.append({"type": "angle", "severity": "warning", "message": "Turn your head slightly to the left."})
                    else:
                        issues.append({"type": "angle", "severity": "error", "message": "Face the camera directly. Don't turn your head."})
            except:
                # If landmark detection fails, give partial points
                quality_score += 8

            # Determine overall success
            # Quality score must be >= 70 AND no critical errors (no_face, multiple_faces, decode)
            success = quality_score >= 70 and not any(issue['severity'] == 'error' for issue in issues)

            return json.dumps({
                "success": success,
                "quality_score": quality_score,
                "message": f"Quality score: {quality_score}/100",
                "issues": issues,
                "metrics": {
                    "blur_score": float(laplacian_var),
                    "brightness": float(brightness),
                    "face_size_ratio": float(face_size_ratio),
                    "center_offset": float(max_offset)
                }
            })

        except Exception as e:
            import sys
            sys.stderr.write(f"❌ Error checking face quality: {e}\n")
            sys.stderr.flush()
            return json.dumps({
                "success": False,
                "quality_score": 0,
                "message": f"Error checking face quality: {str(e)}",
                "issues": [{"type": "error", "severity": "error", "message": str(e)}]
            })

    @pyqtSlot(int, str, result=str)
    def registerFaceEncoding(self, employee_id, photo_base64):
        """
        Register face encoding for an employee from a photo.

        Args:
            employee_id (int): Database ID of employee
            photo_base64 (str): Base64 encoded photo (data:image/png;base64,...)

        Returns:
            str: JSON string with result
        """
        import json
        import numpy as np

        try:
            # Import face_recognition library
            import face_recognition
        except ImportError as e:
            import sys
            sys.stderr.write(f"❌ Failed to import face_recognition: {e}\n")
            sys.stderr.flush()
            return json.dumps({
                "success": False,
                "message": f"Face recognition library not installed: {str(e)}"
            })
        except Exception as e:
            import sys
            sys.stderr.write(f"❌ Unexpected error importing face_recognition: {e}\n")
            sys.stderr.flush()
            return json.dumps({
                "success": False,
                "message": f"Error loading face recognition: {str(e)}"
            })

        try:
            # First, check photo quality before processing
            quality_check_result = self.checkFaceQuality(photo_base64)
            quality_data = json.loads(quality_check_result)

            # If quality check fails, return detailed error
            if not quality_data.get('success', False):
                import sys
                sys.stderr.write(f"⚠️ Face quality check failed: {quality_data.get('message')}\n")
                sys.stderr.flush()

                # Return detailed quality issues
                return json.dumps({
                    "success": False,
                    "message": quality_data.get('message', 'Photo quality check failed'),
                    "quality_score": quality_data.get('quality_score', 0),
                    "issues": quality_data.get('issues', [])
                })

            # Quality check passed, proceed with registration
            import sys
            sys.stderr.write(f"✅ Face quality check passed: {quality_data.get('quality_score')}/100\n")
            sys.stderr.flush()

            # Remove data URL prefix
            if "base64," in photo_base64:
                photo_base64 = photo_base64.split("base64,")[1]

            # Decode base64
            photo_bytes = base64.b64decode(photo_base64)

            # Save photo to faces directory in app data dir
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            data_dir = get_app_data_dir()
            faces_dir = data_dir / "faces"
            faces_dir.mkdir(parents=True, exist_ok=True)

            photo_filename = f"employee_{employee_id}_{timestamp}.png"
            photo_path = faces_dir / photo_filename

            with open(photo_path, "wb") as f:
                f.write(photo_bytes)

            # Load image and detect faces
            image = face_recognition.load_image_file(str(photo_path))
            face_encodings = face_recognition.face_encodings(image)

            if len(face_encodings) == 0:
                # Delete the saved photo since no face was detected
                os.remove(photo_path)
                return json.dumps({
                    "success": False,
                    "message": "No face detected in the photo. Please try again with a clear face photo."
                })

            if len(face_encodings) > 1:
                # Delete the saved photo since multiple faces were detected
                os.remove(photo_path)
                return json.dumps({
                    "success": False,
                    "message": "Multiple faces detected. Please ensure only one face is visible in the photo."
                })

            # Get the face encoding (first and only one)
            face_encoding = face_encodings[0]

            # Convert numpy array to list and then to JSON
            face_encoding_json = json.dumps(face_encoding.tolist())

            # Save to database
            success, message = self.db.save_face_encoding(
                employee_id,
                face_encoding_json,
                str(photo_path)
            )

            if success:
                # Clear face encodings cache after registration
                self._face_encodings_cache = None
                self._cache_timestamp = None

                # Fetch backend_id for cloud sync
                conn = self.db.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT backend_id FROM employee WHERE id = ?", (employee_id,))
                row = cursor.fetchone()
                backend_id = row[0] if row else None
                conn.close()

                return json.dumps({
                    "success": True,
                    "message": "Face registered successfully!",
                    "photo_path": str(photo_path),
                    "face_encoding": face_encoding_json,  # Return encoding for cloud upload
                    "employee_id": employee_id,  # Local database ID
                    "backend_id": backend_id  # Backend API ID for cloud sync
                })
            else:
                # Delete photo if database save failed
                os.remove(photo_path)
                return json.dumps({
                    "success": False,
                    "message": message
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error registering face: {str(e)}"
            })

    @pyqtSlot(str, result=str)
    def recognizeFace(self, photo_base64):
        """
        Recognize face from photo and match against all registered employees.

        Args:
            photo_base64 (str): Base64 encoded photo

        Returns:
            str: JSON string with matched employee or null
        """
        import json
        import numpy as np

        try:
            # Import face_recognition library
            import face_recognition
        except ImportError as e:
            import sys
            sys.stderr.write(f"❌ Failed to import face_recognition in recognizeFace: {e}\n")
            sys.stderr.flush()
            return json.dumps({
                "success": False,
                "message": f"Face recognition library not installed: {str(e)}"
            })
        except Exception as e:
            import sys
            sys.stderr.write(f"❌ Unexpected error importing face_recognition in recognizeFace: {e}\n")
            sys.stderr.flush()
            return json.dumps({
                "success": False,
                "message": f"Error loading face recognition: {str(e)}"
            })

        try:
            # Remove data URL prefix
            if "base64," in photo_base64:
                photo_base64 = photo_base64.split("base64,")[1]

            # Decode base64
            photo_bytes = base64.b64decode(photo_base64)

            # Load image directly from bytes (no temp file I/O for better performance)
            from PIL import Image
            import io

            # Open image from bytes
            pil_image = Image.open(io.BytesIO(photo_bytes))

            # Convert PIL image to numpy array (required by face_recognition)
            image = np.array(pil_image)

            # Detect faces
            face_encodings = face_recognition.face_encodings(image)

            if len(face_encodings) == 0:
                return json.dumps({
                    "success": True,
                    "employee": None,
                    "message": "No face detected in the photo"
                })

            if len(face_encodings) > 1:
                return json.dumps({
                    "success": True,
                    "employee": None,
                    "message": "Multiple faces detected"
                })

            # Get the face encoding to match
            unknown_face_encoding = face_encodings[0]

            # Get all registered face encodings (uses cache for performance)
            registered_employees = self._get_cached_face_encodings()

            if not registered_employees:
                return json.dumps({
                    "success": True,
                    "employee": None,
                    "message": "No registered faces in the system"
                })

            # Compare against all registered faces
            best_match = None
            best_distance = 1.0  # Lower is better, 0.0 is perfect match
            HIGH_CONFIDENCE_THRESHOLD = 0.4  # Early stopping threshold for very confident matches

            for emp_id, name, face_encoding_json, employee_number in registered_employees:
                # Parse stored encoding
                stored_encoding = np.array(json.loads(face_encoding_json))

                # Calculate face distance (lower = more similar)
                face_distance = face_recognition.face_distance([stored_encoding], unknown_face_encoding)[0]

                # OPTIMIZATION: Early stopping if we find a very high confidence match
                # This avoids checking remaining employees when we're very confident
                if face_distance < HIGH_CONFIDENCE_THRESHOLD:
                    best_match = {
                        "id": emp_id,
                        "name": name,
                        "employee_number": employee_number,
                        "confidence": round((1 - face_distance) * 100, 2)
                    }
                    best_distance = face_distance
                    break  # Stop searching, we found a highly confident match

                # Check if this is the best match so far
                if face_distance < best_distance:
                    best_distance = face_distance
                    best_match = {
                        "id": emp_id,
                        "name": name,
                        "employee_number": employee_number,
                        "confidence": round((1 - best_distance) * 100, 2)  # Convert to percentage
                    }

            # Use confidence threshold (0.6 = 60% match required)
            # Face distance < 0.6 is generally considered a match
            if best_match and best_distance < 0.6:
                return json.dumps({
                    "success": True,
                    "employee": best_match,
                    "message": f"Match found: {best_match['name']} ({best_match['confidence']}% confidence)"
                })
            else:
                return json.dumps({
                    "success": True,
                    "employee": None,
                    "message": "No match found (confidence too low)"
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "employee": None,
                "message": f"Error recognizing face: {str(e)}"
            })

    @pyqtSlot(int, result=str)
    def deleteFaceRegistration(self, employee_id):
        """
        Delete face registration for an employee.

        Args:
            employee_id (int): Database ID of employee

        Returns:
            str: JSON string with result
        """
        import json

        try:
            # Get face photo path before deleting
            success, face_encoding_json, photo_path = self.db.get_face_encoding(employee_id)

            # Delete from database
            success, message = self.db.delete_face_encoding(employee_id)

            if success:
                # Try to delete the photo file if it exists
                if photo_path and os.path.exists(photo_path):
                    try:
                        os.remove(photo_path)
                    except Exception as e:
                        pass

                return json.dumps({
                    "success": True,
                    "message": "Face registration deleted successfully"
                })
            else:
                return json.dumps({
                    "success": False,
                    "message": message
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error deleting face registration: {str(e)}"
            })

    @pyqtSlot(int, result=str)
    def getFaceRegistrationStatus(self, employee_id):
        """
        Get face registration status for an employee.

        Args:
            employee_id (int): Database ID of employee

        Returns:
            str: JSON string with status
        """
        import json

        try:
            has_registration, registered_at = self.db.get_face_registration_status(employee_id)

            return json.dumps({
                "success": True,
                "has_registration": has_registration,
                "registered_at": registered_at
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error getting face registration status: {str(e)}"
            })

    @pyqtSlot(result=str)
    def getAllFaceRegistrationStatuses(self):
        """
        Get face registration status for all employees.

        Returns:
            str: JSON string with array of {employee_number, has_registration, registered_at}
        """
        import json

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT employee_number, has_face_registration, face_registered_at
                FROM employee
                WHERE deleted_at IS NULL AND employee_number IS NOT NULL
            """)

            rows = cursor.fetchall()
            conn.close()

            statuses = []
            for row in rows:
                employee_number, has_registration, registered_at = row
                statuses.append({
                    "employee_number": employee_number,
                    "has_face_registration": bool(has_registration),
                    "face_registered_at": registered_at
                })

            return json.dumps({
                "success": True,
                "data": statuses
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error getting face registration statuses: {str(e)}",
                "data": []
            })

    @pyqtSlot()
    def populateDummyFaceData(self):
        """
        Start populating dummy face data with progress updates.
        Processes employees in batches of 100 to keep UI responsive.
        Emits populateProgressUpdate signal for each batch.
        """
        import json
        import time
        import sqlite3

        try:
            # Get all active employees
            conn = sqlite3.connect(self.db.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, employee_number
                FROM employee
                WHERE deleted_at IS NULL
                ORDER BY id
            """)
            employees = cursor.fetchall()
            conn.close()

            if not employees:
                # Emit immediate completion with no employees
                self.populateProgressUpdate.emit(json.dumps({
                    "processed": 0,
                    "total": 0,
                    "percent": 100,
                    "complete": True,
                    "success": False,
                    "message": "No employees found in database"
                }))
                return

            # Initialize batch processing state
            self._populate_state = {
                "employees": employees,
                "total": len(employees),
                "current_index": 0,
                "success_count": 0,
                "failed_count": 0,
                "batch_size": 100,
                "start_time": time.time()
            }

            # Start processing first batch
            self._process_populate_batch()

        except Exception as e:
            import sys
            sys.stderr.write(f"❌ Error starting populateDummyFaceData: {e}\n")
            sys.stderr.flush()
            self.populateProgressUpdate.emit(json.dumps({
                "processed": 0,
                "total": 0,
                "percent": 0,
                "complete": True,
                "success": False,
                "message": f"Error: {str(e)}"
            }))

    def _process_populate_batch(self):
        """Process one batch of employees (called by QTimer)."""
        import json
        import numpy as np
        import time

        if not self._populate_state:
            return

        state = self._populate_state
        employees = state["employees"]
        start_idx = state["current_index"]
        end_idx = min(start_idx + state["batch_size"], state["total"])

        # Process this batch
        for i in range(start_idx, end_idx):
            employee_id, name, employee_number = employees[i]
            try:
                # Generate unique random face encoding (128 dimensions)
                face_encoding = np.random.uniform(-0.5, 0.5, 128)
                face_encoding_json = json.dumps(face_encoding.tolist())
                photo_path = "dummy_face_test.png"

                # Save to database
                success, msg = self.db.save_face_encoding(
                    employee_id,
                    face_encoding_json,
                    photo_path
                )

                if success:
                    state["success_count"] += 1
                else:
                    state["failed_count"] += 1

            except Exception as e:
                state["failed_count"] += 1

        # Update current index
        state["current_index"] = end_idx
        processed = state["current_index"]
        total = state["total"]
        percent = round((processed / total) * 100)

        # Emit progress update
        self.populateProgressUpdate.emit(json.dumps({
            "processed": processed,
            "total": total,
            "percent": percent,
            "complete": False
        }))

        # Check if we're done
        if processed >= total:
            # All batches complete
            duration = round(time.time() - state["start_time"], 2)

            # Clear cache
            self._face_encodings_cache = None
            self._cache_timestamp = None

            # Emit final completion
            self.populateProgressUpdate.emit(json.dumps({
                "processed": processed,
                "total": total,
                "percent": 100,
                "complete": True,
                "success": True,
                "message": f"Successfully populated dummy face data for {state['success_count']} employees",
                "count": state["success_count"],
                "failed": state["failed_count"],
                "duration": duration
            }))

            # Clean up state
            self._populate_state = None
        else:
            # Schedule next batch with QTimer (allows UI to update)
            QTimer.singleShot(10, self._process_populate_batch)

    @pyqtSlot(result=str)
    def clearAllFaceData(self):
        """
        Clear ALL face registrations for all employees.
        Used for cleanup after performance testing.

        Returns:
            str: JSON string with result
        """
        import json
        import time
        import sqlite3

        try:
            start_time = time.time()

            # Get all employees with face registrations
            conn = sqlite3.connect(self.db.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name
                FROM employee
                WHERE has_face_registration = 1 AND deleted_at IS NULL
            """)
            employees = cursor.fetchall()
            conn.close()

            if not employees:
                return json.dumps({
                    "success": True,
                    "message": "No face registrations to clear",
                    "count": 0,
                    "duration": 0
                })

            # Clear face encodings for all employees
            # Note: Cloud sync not triggered here - use "Refresh from Live" to sync deletions to cloud
            success_count = 0
            failed_count = 0

            for employee_id, name in employees:
                try:
                    success, msg = self.db.delete_face_encoding(employee_id)

                    if success:
                        success_count += 1
                    else:
                        failed_count += 1
                        import sys
                        sys.stderr.write(f"⚠️ Failed to clear face for employee {employee_id}: {msg}\n")
                        sys.stderr.flush()

                except Exception as e:
                    failed_count += 1
                    import sys
                    sys.stderr.write(f"❌ Error clearing face for employee {employee_id}: {e}\n")
                    sys.stderr.flush()

            # Clear face encodings cache after bulk deletion
            self._face_encodings_cache = None
            self._cache_timestamp = None

            end_time = time.time()
            duration = round(end_time - start_time, 2)

            import sys
            sys.stderr.write(f"✅ Cleared face data: {success_count} successful, {failed_count} failed, {duration}s\n")
            sys.stderr.flush()

            return json.dumps({
                "success": True,
                "message": f"Successfully cleared face data for {success_count} employees",
                "count": success_count,
                "failed": failed_count,
                "total": len(employees),
                "duration": duration
            })

        except Exception as e:
            import sys
            sys.stderr.write(f"❌ Error in clearAllFaceData: {e}\n")
            sys.stderr.flush()
            return json.dumps({
                "success": False,
                "message": f"Error clearing face data: {str(e)}",
                "count": 0,
                "duration": 0
            })

    @pyqtSlot(int, result=str)
    def deleteFaceEncoding(self, employee_id):
        """
        Delete face encoding for a single employee.
        Returns backend_id so frontend can delete from cloud API.

        Args:
            employee_id (int): Employee database ID

        Returns:
            str: JSON string with result and backend_id for cloud deletion
        """
        import json
        import sqlite3

        try:
            # Get backend_id before deletion
            conn = sqlite3.connect(self.db.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT backend_id, name FROM employee WHERE id = ?", (employee_id,))
            result = cursor.fetchone()
            conn.close()

            if not result:
                return json.dumps({
                    "success": False,
                    "message": "Employee not found"
                })

            backend_id, employee_name = result

            # Delete locally
            success, message = self.db.delete_face_encoding(employee_id)

            if success:
                # Clear cache
                self._face_encodings_cache = None
                self._cache_timestamp = None

                return json.dumps({
                    "success": True,
                    "message": message,
                    "backend_id": backend_id,
                    "employee_name": employee_name
                })
            else:
                return json.dumps({
                    "success": False,
                    "message": message
                })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error deleting face encoding: {str(e)}"
            })

    @pyqtSlot(result=str)
    def resetDatabase(self):
        """
        Reset the database - drop all tables and recreate schema.

        Returns:
            str: JSON string with result
        """
        import json

        try:
            success, message = self.db.reset_database()

            return json.dumps({
                "success": success,
                "message": message
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error resetting database: {str(e)}"
            })

    @pyqtSlot(result=str)
    def getUnsyncedTimesheets(self):
        """
        Get all unsynced timesheets from local database.

        Returns:
            str: JSON string with array of unsynced timesheet records
        """
        import json

        try:
            unsynced_logs = self.db.get_unsynced_logs()

            timesheets = []
            for log in unsynced_logs:
                # Unpack: id, employee_id, employee_backend_id, employee_code,
                #         name, log_type, date, time, photo_path, sync_id
                (log_id, local_emp_id, backend_emp_id, emp_code, emp_name,
                 log_type, date, time, photo_path, sync_id) = log

                timesheets.append({
                    "id": log_id,  # Local database ID
                    "employee_id": local_emp_id,  # Local employee table ID
                    "employee": backend_emp_id,  # Backend employee ID for API
                    "employee_code": emp_code,
                    "employee_name": emp_name,
                    "log_type": log_type,
                    "date": date,
                    "log_time": time,  # Renamed to match API format
                    "photo_path": photo_path,
                    "sync_id": sync_id
                })

            return json.dumps({
                "success": True,
                "data": timesheets,
                "count": len(timesheets)
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "data": [],
                "count": 0,
                "error": str(e)
            })

    @pyqtSlot(int, int, result=str)
    def markTimesheetSynced(self, log_id, backend_timesheet_id):
        """
        Mark a timesheet entry as successfully synced.

        Args:
            log_id (int): Local database ID of timesheet entry
            backend_timesheet_id (int): Backend ID returned from API

        Returns:
            str: JSON string with result
        """
        import json

        try:
            self.db.mark_as_synced(log_id, backend_timesheet_id)

            return json.dumps({
                "success": True,
                "message": "Timesheet marked as synced"
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error marking timesheet as synced: {str(e)}"
            })

    @pyqtSlot(int, str, result=str)
    def markTimesheetSyncFailed(self, log_id, error_message):
        """
        Mark a timesheet entry sync as failed.

        Args:
            log_id (int): Local database ID of timesheet entry
            error_message (str): Error message from sync attempt

        Returns:
            str: JSON string with result
        """
        import json

        try:
            self.db.mark_sync_failed(log_id, error_message)

            return json.dumps({
                "success": True,
                "message": "Timesheet sync failure recorded"
            })

        except Exception as e:
            return json.dumps({
                "success": False,
                "message": f"Error recording sync failure: {str(e)}"
            })
