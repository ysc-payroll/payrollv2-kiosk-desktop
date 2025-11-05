"""
Create new database schema with Company, Employee, and Timesheet tables.
"""
import sqlite3
from pathlib import Path


def create_new_schema():
    """Create the new database schema."""

    # Database path
    db_path = Path("database/kiosk.db")
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    print("Creating new database schema...")

    # Create Company table
    print("\n1. Creating Company table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS company (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backend_id INTEGER UNIQUE,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create index on backend_id
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_company_backend_id ON company(backend_id)
    """)

    # Create Employee table
    print("2. Creating Employee table...")
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

    # Create index on backend_id, employee_code, and deleted_at
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_employee_backend_id ON employee(backend_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_employee_code ON employee(employee_code)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_employee_deleted_at ON employee(deleted_at)
    """)

    # Create Timesheet table
    print("3. Creating Timesheet table...")
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employee(id)
        )
    """)

    # Create indexes on timesheet
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timesheet_sync_id ON timesheet(sync_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timesheet_employee_id ON timesheet(employee_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timesheet_date ON timesheet(date)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timesheet_is_synced ON timesheet(is_synced)
    """)

    conn.commit()
    print("\n✓ Schema created successfully!")

    # Display table info
    print("\n" + "="*50)
    print("DATABASE SCHEMA")
    print("="*50)

    for table_name in ['company', 'employee', 'timesheet']:
        print(f"\n{table_name.upper()} TABLE:")
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]}: {col[2]}")

    conn.close()
    print("\n" + "="*50)


if __name__ == "__main__":
    create_new_schema()
