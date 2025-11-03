"""
Migration script to add status and error_message fields to timesheet table.
This tracks whether each time entry was successful.
"""
import sqlite3
from pathlib import Path


def add_status_fields():
    """Add status and error_message columns to timesheet table."""

    db_path = Path("database/kiosk.db")

    if not db_path.exists():
        print("Error: Database does not exist. Run create_schema.py first.")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    print("Adding status tracking fields to timesheet table...")

    # Check if columns already exist
    cursor.execute("PRAGMA table_info(timesheet)")
    columns = [col[1] for col in cursor.fetchall()]

    # Add status column if it doesn't exist
    if 'status' not in columns:
        print("  - Adding 'status' column...")
        cursor.execute("""
            ALTER TABLE timesheet
            ADD COLUMN status TEXT DEFAULT 'success' CHECK(status IN ('success', 'error'))
        """)
        print("    ✓ Added 'status' column")
    else:
        print("  - 'status' column already exists")

    # Add error_message column if it doesn't exist
    if 'error_message' not in columns:
        print("  - Adding 'error_message' column...")
        cursor.execute("""
            ALTER TABLE timesheet
            ADD COLUMN error_message TEXT
        """)
        print("    ✓ Added 'error_message' column")
    else:
        print("  - 'error_message' column already exists")

    conn.commit()

    # Display updated schema
    print("\n" + "="*50)
    print("UPDATED TIMESHEET TABLE SCHEMA")
    print("="*50)
    cursor.execute("PRAGMA table_info(timesheet)")
    columns = cursor.fetchall()
    for col in columns:
        nullable = "NULL" if col[3] == 0 else "NOT NULL"
        default = f" DEFAULT {col[4]}" if col[4] else ""
        print(f"  {col[1]}: {col[2]} {nullable}{default}")

    conn.close()
    print("\n✓ Migration completed successfully!")


if __name__ == "__main__":
    add_status_fields()
