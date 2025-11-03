"""
Quick test script to verify database operations work correctly.
Run this before launching the full application.
"""
from database import Database
import os

def test_database():
    print("=" * 50)
    print("Testing Timekeeper Kiosk Database")
    print("=" * 50)

    # Initialize database
    print("\n1. Initializing database...")
    db = Database()
    print("   ✓ Database initialized")

    # Test logging IN
    print("\n2. Testing Clock IN...")
    success, message, log_id = db.log_time_entry("TEST001", "IN", "test_photo.png")
    if success:
        print(f"   ✓ {message} (Log ID: {log_id})")
    else:
        print(f"   ✗ Error: {message}")
        return False

    # Test logging OUT
    print("\n3. Testing Clock OUT...")
    success, message, log_id = db.log_time_entry("TEST001", "OUT", "test_photo.png")
    if success:
        print(f"   ✓ {message} (Log ID: {log_id})")
    else:
        print(f"   ✗ Error: {message}")
        return False

    # Test validation - empty employee ID
    print("\n4. Testing validation (empty ID)...")
    success, message, log_id = db.log_time_entry("", "IN")
    if not success:
        print(f"   ✓ Validation working: {message}")
    else:
        print(f"   ✗ Validation failed - should reject empty ID")
        return False

    # Test validation - invalid action
    print("\n5. Testing validation (invalid action)...")
    success, message, log_id = db.log_time_entry("TEST001", "INVALID")
    if not success:
        print(f"   ✓ Validation working: {message}")
    else:
        print(f"   ✗ Validation failed - should reject invalid action")
        return False

    # Retrieve recent logs
    print("\n6. Retrieving recent logs...")
    logs = db.get_recent_logs(5)
    print(f"   ✓ Found {len(logs)} log entries:")
    for log in logs:
        log_id, emp_id, action, timestamp, photo_path, synced = log
        print(f"      - ID {log_id}: Employee {emp_id} | {action} | {timestamp} | Synced: {bool(synced)}")

    # Check file structure
    print("\n7. Checking file structure...")
    if os.path.exists("database/kiosk.db"):
        print("   ✓ Database file exists")
    else:
        print("   ✗ Database file not found")
        return False

    if os.path.exists("database/photos"):
        print("   ✓ Photos directory exists")
    else:
        print("   ✗ Photos directory not found")
        return False

    print("\n" + "=" * 50)
    print("All tests passed! ✓")
    print("=" * 50)
    print("\nYou can now run the application:")
    print("  python main.py")
    print("\n")

    return True

if __name__ == "__main__":
    test_database()
