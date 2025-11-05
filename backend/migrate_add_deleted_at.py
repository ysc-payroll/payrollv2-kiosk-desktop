"""
Migration script to add deleted_at column to employee table.
"""
import sqlite3
from pathlib import Path


def migrate_add_deleted_at():
    """Add deleted_at column to employee table if it doesn't exist."""

    db_path = Path("database/kiosk.db")

    if not db_path.exists():
        print("Database does not exist. Run create_schema.py first.")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    print("Checking if deleted_at column exists...")

    # Check if column already exists
    cursor.execute("PRAGMA table_info(employee)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]

    if 'deleted_at' in column_names:
        print("✓ deleted_at column already exists. No migration needed.")
        conn.close()
        return

    print("Adding deleted_at column to employee table...")

    try:
        # Add deleted_at column
        cursor.execute("""
            ALTER TABLE employee ADD COLUMN deleted_at DATETIME
        """)

        # Create index on deleted_at
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_employee_deleted_at ON employee(deleted_at)
        """)

        conn.commit()
        print("✓ Migration completed successfully!")

        # Display updated table info
        print("\nUpdated EMPLOYEE TABLE:")
        cursor.execute("PRAGMA table_info(employee)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]}: {col[2]}")

    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")

    finally:
        conn.close()


if __name__ == "__main__":
    migrate_add_deleted_at()
