"""
Seed sample data for Company, Employee, and Timesheet tables.
"""
import sqlite3
from datetime import datetime, timedelta
import random


def seed_sample_data():
    """Insert sample data into the database."""

    conn = sqlite3.connect("database/kiosk.db")
    cursor = conn.cursor()

    print("="*50)
    print("SEEDING SAMPLE DATA")
    print("="*50)

    # Sample companies
    print("\n1. Adding sample companies...")
    companies = [
        (1001, "Acme Corporation"),
        (1002, "Tech Solutions Inc."),
        (1003, "Global Services Ltd."),
    ]

    for backend_id, name in companies:
        cursor.execute("""
            INSERT OR IGNORE INTO company (backend_id, name)
            VALUES (?, ?)
        """, (backend_id, name))
        print(f"   - {name} (backend_id: {backend_id})")

    # Sample employees
    print("\n2. Adding sample employees...")
    employees = [
        (2001, "Juan Dela Cruz", "EMP001", 1),
        (2002, "Maria Santos", "EMP002", 2),
        (2003, "Pedro Reyes", "EMP003", 3),
        (2004, "Ana Garcia", "EMP004", 4),
        (2005, "Jose Rizal", "EMP005", 5),
        (2006, "Carmen Lopez", "EMP006", 6),
        (2007, "Miguel Torres", "EMP007", 7),
        (2008, "Sofia Mendoza", "EMP008", 8),
    ]

    for backend_id, name, code, emp_number in employees:
        cursor.execute("""
            INSERT OR IGNORE INTO employee (backend_id, name, employee_code, employee_number)
            VALUES (?, ?, ?, ?)
        """, (backend_id, name, code, emp_number))
        print(f"   - {name} ({code}) [backend_id: {backend_id}, employee_number: {emp_number}]")

    conn.commit()

    # Get employee IDs from database
    cursor.execute("SELECT id, employee_code, name FROM employee")
    db_employees = cursor.fetchall()

    # Sample timesheet entries
    print("\n3. Adding sample timesheet entries...")

    company_id = 1001  # Using first company
    start_date = datetime.now() - timedelta(days=7)

    entry_count = 0
    for i in range(30):
        # Random employee
        emp_id, emp_code, emp_name = random.choice(db_employees)

        # Random log type (alternating)
        log_type = "in" if i % 2 == 0 else "out"

        # Increment time
        timestamp = start_date + timedelta(hours=random.randint(4, 12), minutes=random.randint(0, 59))
        start_date = timestamp

        date_str = timestamp.strftime("%Y-%m-%d")
        time_str = timestamp.strftime("%H:%M")

        # Create sync_id
        sync_id = f"{company_id}_{emp_id}_{timestamp.strftime('%Y%m%d%H%M%S')}"

        try:
            cursor.execute("""
                INSERT INTO timesheet (sync_id, employee_id, log_type, date, time, is_synced)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (sync_id, emp_id, log_type, date_str, time_str, 0))

            entry_count += 1
            print(f"   - {emp_code} ({emp_name}): {log_type.upper()} on {date_str} at {time_str}")

        except sqlite3.IntegrityError:
            # Skip duplicate sync_id
            pass

    conn.commit()

    print(f"\n✓ Added {entry_count} timesheet entries!")

    # Display summary
    print("\n" + "="*50)
    print("DATABASE SUMMARY")
    print("="*50)

    cursor.execute("SELECT COUNT(*) FROM company")
    company_count = cursor.fetchone()[0]
    print(f"\nCompanies: {company_count}")

    cursor.execute("SELECT COUNT(*) FROM employee")
    employee_count = cursor.fetchone()[0]
    print(f"Employees: {employee_count}")

    cursor.execute("SELECT COUNT(*) FROM timesheet")
    timesheet_count = cursor.fetchone()[0]
    print(f"Timesheet entries: {timesheet_count}")

    cursor.execute("SELECT COUNT(*) FROM timesheet WHERE is_synced = 0")
    unsynced_count = cursor.fetchone()[0]
    print(f"Unsynced entries: {unsynced_count}")

    # Show recent timesheet entries
    print("\n" + "="*50)
    print("RECENT TIMESHEET ENTRIES (Last 10)")
    print("="*50)

    cursor.execute("""
        SELECT t.id, e.employee_code, e.name, t.log_type, t.date, t.time, t.is_synced
        FROM timesheet t
        JOIN employee e ON t.employee_id = e.id
        ORDER BY t.date DESC, t.time DESC
        LIMIT 10
    """)

    entries = cursor.fetchall()
    for entry in entries:
        entry_id, emp_code, emp_name, log_type, date, time, synced = entry
        sync_status = "✓" if synced else "✗"
        print(f"  [{sync_status}] {emp_code} - {emp_name}: {log_type.upper()} @ {date} {time}")

    conn.close()
    print("\n" + "="*50)
    print("✓ Sample data seeded successfully!")
    print("="*50 + "\n")


if __name__ == "__main__":
    seed_sample_data()
