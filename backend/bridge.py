"""
Python-JavaScript bridge using PyQt6 QWebChannel.
Exposes Python methods to the Vue.js frontend.
"""
import base64
import os
from datetime import datetime
from pathlib import Path
from PyQt6.QtCore import QObject, pyqtSlot
from PyQt6.QtWidgets import QFileDialog
from database import Database


class KioskBridge(QObject):
    """Bridge between Vue.js frontend and Python backend."""

    def __init__(self, parent=None):
        super().__init__()
        self.db = Database()
        self.parent = parent  # Store parent widget for file dialogs

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
                    system_id = emp.get('system_id')
                    first_name = emp.get('first_name', '')
                    last_name = emp.get('last_name', '')
                    middle_name = emp.get('middle_name', '')

                    # Build full name
                    full_name = f"{first_name} {middle_name} {last_name}".strip()
                    if not full_name:
                        full_name = f"{first_name} {last_name}".strip()

                    # Use system_id as employee_number
                    employee_number = system_id

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
                    print(f"Error syncing employee {emp.get('system_id')}: {e}")
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

            for emp in employees:
                try:
                    # Extract employee data from API response
                    # API returns: id, timekeeper_id, name
                    system_id = emp.get('id')  # Maps to backend_id in database
                    employee_number = emp.get('timekeeper_id')  # Maps to employee_number in database
                    full_name = emp.get('name', '')  # Name is already complete

                    # Track API backend IDs
                    api_backend_ids.append(system_id)

                    # Check if employee already exists
                    cursor.execute("""
                        SELECT id, name, employee_number, deleted_at FROM employee WHERE backend_id = ?
                    """, (system_id,))

                    existing = cursor.fetchone()

                    if existing:
                        emp_id, current_name, current_number, deleted_at = existing

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
                        # else: no changes, don't count anything
                    else:
                        # Insert new employee
                        cursor.execute("""
                            INSERT INTO employee (backend_id, name, employee_number)
                            VALUES (?, ?, ?)
                        """, (system_id, full_name, employee_number))
                        added_count += 1

                except Exception as e:
                    print(f"Error syncing employee {emp.get('id')}: {e}")
                    skipped_count += 1
                    skipped_details.append({
                        "backend_id": emp.get('id'),
                        "name": emp.get('name', 'Unknown'),
                        "reason": f"Error: {str(e)}"
                    })
                    continue

            # Step 3: Soft-delete employees not in API list
            # Find employees that are NOT in the API list and NOT already soft-deleted
            print(f"API returned {len(api_backend_ids)} employees")

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
            print(f"Found {len(employees_to_delete)} employees to potentially delete")

            for emp_id, backend_id, name in employees_to_delete:
                print(f"Checking employee for deletion: {name} (backend_id: {backend_id})")

                # Check if employee has application records
                has_records, record_types = self.db.check_employee_has_applications(backend_id)

                if has_records:
                    # Skip deletion if employee has records
                    print(f"  -> Skipped (has records: {record_types})")
                    skipped_count += 1
                    skipped_details.append({
                        "backend_id": backend_id,
                        "name": name,
                        "reason": f"Has records: {', '.join(record_types)}"
                    })
                else:
                    # Soft-delete the employee
                    print(f"  -> Soft-deleting")
                    cursor.execute("""
                        UPDATE employee
                        SET deleted_at = ?
                        WHERE id = ?
                    """, (datetime.now().isoformat(), emp_id))
                    deleted_count += 1

            # Commit transaction
            conn.commit()
            conn.close()

            return json.dumps({
                "success": True,
                "added_count": added_count,
                "updated_count": updated_count,
                "deleted_count": deleted_count,
                "skipped_count": skipped_count,
                "skipped_details": skipped_details,
                "message": f"Sync complete: {added_count} added, {updated_count} updated, {deleted_count} removed"
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
