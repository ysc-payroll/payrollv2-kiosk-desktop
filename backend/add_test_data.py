"""
Add test timesheet data to the database.
"""
from database import Database
from datetime import datetime, timedelta
import random

def add_test_data():
    db = Database()

    print("Adding 50 test timesheet records...")

    # Employee IDs to use
    employee_ids = ["EMP001", "EMP002", "EMP003", "EMP004", "EMP005", "EMP006", "EMP007", "EMP008"]
    actions = ["IN", "OUT"]

    # Start from 25 days ago
    start_date = datetime.now() - timedelta(days=25)

    for i in range(50):
        # Random employee
        emp_id = random.choice(employee_ids)

        # Alternate between IN and OUT
        action = actions[i % 2]

        # Increment time by random hours
        time_offset = timedelta(hours=random.randint(1, 8), minutes=random.randint(0, 59))
        timestamp = start_date + time_offset
        start_date = timestamp

        # Insert record
        conn = db.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO kiosk_logs (employee_id, action, timestamp, photo_path, synced)
            VALUES (?, ?, ?, ?, 0)
        """, (emp_id, action, timestamp.strftime("%Y-%m-%d %H:%M:%S"), f"test_photo_{i}.png"))

        conn.commit()
        conn.close()

        print(f"  {i+1}/50: {emp_id} - {action} at {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")

    print("\n✓ Successfully added 50 test records!")
    print("\nRecent records:")
    logs = db.get_recent_logs(20)
    for log in logs:
        log_id, emp_id, action, timestamp, photo_path, synced = log
        print(f"  {timestamp} - {emp_id} {action}")

if __name__ == "__main__":
    add_test_data()
