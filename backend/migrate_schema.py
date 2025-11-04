"""
Migration script to update database schema.
- Removes old kiosk_logs table
- Updates users table to support single user without password
"""
import sqlite3
from pathlib import Path


def migrate_database(db_path="database/kiosk.db"):
    """Run database migration."""
    print(f"Starting migration for: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Step 1: Drop old kiosk_logs table
        print("  - Dropping kiosk_logs table...")
        cursor.execute("DROP TABLE IF EXISTS kiosk_logs")
        print("    ✓ kiosk_logs table removed")

        # Step 2: Check if users table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='users'
        """)

        users_exists = cursor.fetchone()

        if users_exists:
            print("  - Migrating users table...")

            # Get existing user data (if any)
            cursor.execute("SELECT id, email, name FROM users LIMIT 1")
            existing_user = cursor.fetchone()

            # Drop old users table
            cursor.execute("DROP TABLE users")
            print("    ✓ Old users table removed")

            # Create new users table
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY CHECK(id = 1),
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            """)
            print("    ✓ New users table created")

            # Restore user data if it existed
            if existing_user:
                user_id, email, name = existing_user
                cursor.execute("""
                    INSERT INTO users (id, email, name, is_active)
                    VALUES (1, ?, ?, 1)
                """, (email, name))
                print(f"    ✓ Migrated user: {email}")
        else:
            print("  - Creating users table...")
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY CHECK(id = 1),
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            """)
            print("    ✓ Users table created")

        # Commit changes
        conn.commit()
        print("\n✓ Migration completed successfully!")

        # Show current schema
        print("\nCurrent tables:")
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        tables = cursor.fetchall()
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"  - {table[0]}: {count} records")

    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
