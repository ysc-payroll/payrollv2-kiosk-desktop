#!/usr/bin/env python3
"""
Create admin user for timekeeper kiosk application.
Run this script to create the first admin user.
"""
import sqlite3
import hashlib
from pathlib import Path


def create_admin_user():
    """Create default admin user in the database."""

    # Database path
    db_path = str(Path(__file__).parent / "database" / "kiosk.db")

    # Default credentials
    default_email = "admin@company.com"
    default_password = "admin123"  # Change this in production!
    default_name = "Admin User"

    # Hash the password using SHA256
    password_hash = hashlib.sha256(default_password.encode()).hexdigest()

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

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

        # Check if admin user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (default_email,))
        existing_user = cursor.fetchone()

        if existing_user:
            print(f"✓ Admin user already exists with email: {default_email}")
        else:
            # Insert admin user
            cursor.execute("""
                INSERT INTO users (email, password_hash, name, role)
                VALUES (?, ?, ?, 'admin')
            """, (default_email, password_hash, default_name))

            conn.commit()
            print(f"✓ Admin user created successfully!")
            print(f"\nLogin credentials:")
            print(f"  Email:    {default_email}")
            print(f"  Password: {default_password}")
            print(f"\n⚠️  IMPORTANT: Please change the password after first login!")

        conn.close()

    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        return False

    return True


if __name__ == "__main__":
    print("Creating admin user...")
    create_admin_user()
