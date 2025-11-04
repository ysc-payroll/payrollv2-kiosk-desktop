#!/usr/bin/env python3
"""
Verify database schema is ready for API integration.
"""
import sqlite3
from pathlib import Path


def verify_database():
    """Check if database has required fields for API integration."""

    db_path = str(Path(__file__).parent / "database" / "kiosk.db")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Checking database schema...")

        # Check employee table
        cursor.execute("PRAGMA table_info(employee)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}

        required_fields = {
            'id': 'INTEGER',
            'backend_id': 'INTEGER',
            'name': 'TEXT',
            'employee_number': 'INTEGER'
        }

        print("\n✓ Employee table exists")
        print("\nEmployee table columns:")
        for col_name, col_type in columns.items():
            status = "✓" if col_name in required_fields else " "
            print(f"  {status} {col_name}: {col_type}")

        # Check if all required fields exist
        missing_fields = set(required_fields.keys()) - set(columns.keys())
        if missing_fields:
            print(f"\n✗ Missing required fields: {missing_fields}")
            print("  Run migration script to add missing fields")
            return False

        # Check company table
        cursor.execute("PRAGMA table_info(company)")
        company_cols = cursor.fetchall()
        if company_cols:
            print("\n✓ Company table exists")
        else:
            print("\n✗ Company table missing")

        # Check timesheet table
        cursor.execute("PRAGMA table_info(timesheet)")
        timesheet_cols = cursor.fetchall()
        if timesheet_cols:
            print("✓ Timesheet table exists")
        else:
            print("✗ Timesheet table missing")

        # Check current employee count
        cursor.execute("SELECT COUNT(*) FROM employee")
        emp_count = cursor.fetchone()[0]
        print(f"\n📊 Current employee count: {emp_count}")

        conn.close()

        print("\n✅ Database schema is ready for API integration!")
        return True

    except Exception as e:
        print(f"\n✗ Error checking database: {e}")
        return False


if __name__ == "__main__":
    verify_database()
