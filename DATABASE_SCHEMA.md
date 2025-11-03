# Database Schema Documentation

## Overview

The timekeeper kiosk application uses SQLite with the following normalized schema:

## Tables

### 1. Company

Stores company information synced from the backend system.

```sql
CREATE TABLE company (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backend_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Fields:**
- `id`: Local primary key (auto-increment)
- `backend_id`: Primary key from backend system (unique)
- `name`: Company name
- `created_at`: Record creation timestamp

**Indexes:**
- `idx_company_backend_id` on `backend_id`

**Sample Data:**
```
id | backend_id | name                    | created_at
1  | 1001       | Acme Corporation        | 2025-11-03 00:17:58
2  | 1002       | Tech Solutions Inc.     | 2025-11-03 00:17:58
3  | 1003       | Global Services Ltd.    | 2025-11-03 00:17:58
```

---

### 2. Employee

Stores employee information synced from the backend system.

```sql
CREATE TABLE employee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backend_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    employee_code TEXT,
    employee_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Fields:**
- `id`: Local primary key (auto-increment)
- `backend_id`: Primary key from backend system (unique)
- `name`: Full employee name
- `employee_code`: Employee code (e.g., "EMP001")
- `employee_number`: Employee number as integer (e.g., 1, 2, 3)
- `created_at`: Record creation timestamp

**Indexes:**
- `idx_employee_backend_id` on `backend_id`
- `idx_employee_code` on `employee_code`

**Sample Data:**
```
id | backend_id | name            | employee_code | employee_number | created_at
1  | 2001       | Juan Dela Cruz  | EMP001        | 1               | 2025-11-03 00:17:58
2  | 2002       | Maria Santos    | EMP002        | 2               | 2025-11-03 00:17:58
3  | 2003       | Pedro Reyes     | EMP003        | 3               | 2025-11-03 00:17:58
```

---

### 3. Timesheet

Stores employee time in/out logs captured by the kiosk.

```sql
CREATE TABLE timesheet (
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
```

**Fields:**
- `id`: Local primary key (auto-increment)
- `sync_id`: Unique identifier format: `{company_id}_{employee_id}_{timestamp}`
- `employee_id`: Foreign key to `employee.id`
- `log_type`: Type of log ("in" or "out") - lowercase only
- `date`: Date in YYYY-MM-DD format
- `time`: Time in HH:MM format (24-hour)
- `photo_path`: Path to captured photo (optional)
- `is_synced`: Boolean flag (0 = not synced, 1 = synced to backend)
- `created_at`: Record creation timestamp

**Indexes:**
- `idx_timesheet_sync_id` on `sync_id`
- `idx_timesheet_employee_id` on `employee_id`
- `idx_timesheet_date` on `date`
- `idx_timesheet_is_synced` on `is_synced`

**Sample Data:**
```
id | sync_id                  | employee_id | log_type | date       | time  | is_synced
30 | 1001_5_20251106235745    | 5           | out      | 2025-11-06 | 23:57 | 0
29 | 1001_1_20251106131801    | 1           | in       | 2025-11-06 | 13:18 | 0
28 | 1001_4_20251106014213    | 4           | out      | 2025-11-06 | 01:42 | 0
```

---

## Setup Scripts

### Create Schema

Creates all tables and indexes:

```bash
python create_schema.py
```

### Seed Sample Data

Populates tables with sample test data:

```bash
python seed_sample_data.py
```

Sample data includes:
- 3 companies
- 8 employees
- 30 timesheet entries (spanning 7 days)

---

## Common Queries

### Get Recent Timesheet Logs (with Employee Info)

```sql
SELECT
    t.id,
    e.employee_code,
    e.name,
    t.log_type,
    t.date,
    t.time,
    t.is_synced
FROM timesheet t
JOIN employee e ON t.employee_id = e.id
ORDER BY t.date DESC, t.time DESC
LIMIT 20;
```

### Get Unsynced Timesheet Entries

```sql
SELECT
    t.*,
    e.employee_code,
    e.name
FROM timesheet t
JOIN employee e ON t.employee_id = e.id
WHERE t.is_synced = 0
ORDER BY t.created_at ASC;
```

### Get Employee Timesheets for Specific Date

```sql
SELECT
    e.employee_code,
    e.name,
    t.log_type,
    t.time
FROM timesheet t
JOIN employee e ON t.employee_id = e.id
WHERE t.date = '2025-11-03'
ORDER BY t.time ASC;
```

### Mark Entries as Synced

```sql
UPDATE timesheet
SET is_synced = 1
WHERE id IN (1, 2, 3);
```

---

## Notes

1. **Sync ID Format**: `{company_id}_{employee_id}_{YYYYMMDDHHmmss}`
   - Example: `1001_5_20251106235745`
   - Ensures uniqueness across companies, employees, and time

2. **Log Type**: Must be lowercase ("in" or "out")
   - Database enforces this with CHECK constraint

3. **Date/Time Storage**: Stored as separate TEXT fields
   - Date: YYYY-MM-DD (ISO 8601)
   - Time: HH:MM (24-hour format)
   - Allows easy querying and filtering

4. **Sync Status**: `is_synced` boolean
   - 0 (false): Not synced to backend
   - 1 (true): Successfully synced

5. **Foreign Keys**: SQLite foreign keys must be explicitly enabled
   ```sql
   PRAGMA foreign_keys = ON;
   ```

---

## Migration from Old Schema

The old `kiosk_logs` table still exists for backward compatibility:

```sql
-- Old schema (Phase 1)
CREATE TABLE kiosk_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    photo_path TEXT,
    synced BOOLEAN DEFAULT 0
)
```

To migrate data from old to new schema, employee records must be created first to satisfy foreign key constraints.

---

## Maintenance

### Vacuum Database

Optimize database file size:

```bash
sqlite3 database/kiosk.db "VACUUM;"
```

### View Table Sizes

```bash
sqlite3 database/kiosk.db "
SELECT
    name as table_name,
    (SELECT COUNT(*) FROM sqlite_master WHERE tbl_name=m.name) as record_count
FROM sqlite_master m
WHERE type='table'
ORDER BY name;
"
```

### Clear All Timesheet Data (Testing Only)

```bash
sqlite3 database/kiosk.db "DELETE FROM timesheet;"
```

---

## Schema Version

**Version**: 1.0
**Date**: 2025-11-03
**Compatible with**: Timekeeper Kiosk v2
