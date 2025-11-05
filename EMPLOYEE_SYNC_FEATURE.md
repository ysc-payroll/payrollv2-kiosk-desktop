# Employee Sync Feature - "Refresh from Live"

## Overview
Added a manual "Refresh from Live" button to the Employee List page that syncs employees from the external API with soft-delete functionality for removed employees.

## Implementation Details

### 1. Database Changes

#### Schema Update (`backend/create_schema.py`)
- Added `deleted_at` column (DATETIME) to `employee` table
- Added index on `deleted_at` for query performance
- Employees with `deleted_at IS NULL` are considered active

#### Migration Script (`backend/migrate_add_deleted_at.py`)
- Created migration script to add `deleted_at` column to existing databases
- Automatically checks if column exists before adding
- Creates index after adding column

### 2. Database Layer (`backend/database.py`)

#### New Methods:
- **`get_employees_timekeeper()`**: Returns all active employees (WHERE deleted_at IS NULL)
- **`check_employee_has_applications(backend_id)`**: Checks if an employee has timesheet records
  - Returns tuple: (has_records: bool, record_types: list)
  - Currently checks timesheet table
  - TODO: Add checks for overtime/leave tables when available

#### Updated Queries:
- All employee lookups now filter out soft-deleted employees
- Added `deleted_at IS NULL` condition to employee queries

### 3. Bridge Layer (`backend/bridge.py`)

#### New Method: `syncEmployeesFromAPIWithCleanup(employees_json)`
**Purpose**: Sync employees with cleanup (soft-delete removed employees)

**Process**:
1. **Add New Employees**: Insert employees that don't exist in local database
2. **Update Existing**: Update name and employee_number for existing employees
3. **Restore Soft-Deleted**: If employee returns to API, set `deleted_at = NULL`
4. **Soft-Delete Removed**: Mark employees not in API as deleted
   - **Safety Check**: Skip deletion if employee has application records
   - Set `deleted_at = CURRENT_TIMESTAMP` for employees without records

**Returns**: JSON with detailed statistics
```json
{
  "success": true,
  "added_count": 5,
  "updated_count": 10,
  "deleted_count": 3,
  "skipped_count": 1,
  "skipped_details": [
    {
      "backend_id": 123,
      "name": "John Doe",
      "reason": "Has records: timesheet (15)"
    }
  ],
  "message": "Sync complete: 5 added, 10 updated, 3 removed"
}
```

#### Updated Methods:
- **`getEmployeeByNumber()`**: Now filters out soft-deleted employees

### 4. API Service (`frontend/src/services/api.js`)

#### New Method: `syncEmployeesWithCleanup()`
**Purpose**: Frontend wrapper for sync operation

**Process**:
1. Fetch employees from API: `GET /api/employees/?limit=1000&is_active=true`
2. Call bridge method: `window.bridge.syncEmployeesFromAPIWithCleanup(JSON.stringify(employees))`
3. Return detailed sync results

### 5. UI Component (`frontend/src/components/EmployeeList.vue`)

#### New Features:

**1. Refresh Button** (Header)
- Green button with sync icon
- Shows "Refreshing..." with spinning icon during sync
- Disabled while loading or refreshing

**2. Confirmation Dialog**
- Shown before sync operation
- Warns user about marking removed employees as inactive
- Notes that employees with applications won't be removed
- Cancel / Continue buttons

**3. Sync Results Dialog**
- Displays detailed sync statistics:
  - **Added**: Number of new employees (green)
  - **Updated**: Number of updated employees (blue)
  - **Removed**: Number of soft-deleted employees (red)
  - **Skipped**: Number of employees not deleted (amber)
- Shows list of skipped employees with reasons
- Scrollable list for multiple skipped employees

**4. Auto-Refresh**
- After successful sync, employee list automatically refreshes
- Maintains current search query and pagination

## User Flow

1. User clicks "Refresh from Live" button
2. Confirmation dialog appears
3. User clicks "Continue"
4. System syncs with API:
   - Adds new employees
   - Updates existing employees
   - Marks removed employees as inactive (unless they have records)
5. Results dialog shows detailed statistics
6. Employee list automatically refreshes
7. User can view skipped employees (those with application records)

## Safety Features

### Soft Delete (Not Hard Delete)
- Employees are marked with `deleted_at` timestamp, not removed
- Data is preserved for historical purposes
- Can be restored if employee returns to API

### Protection for Employees with Records
- Employees with timesheet entries cannot be deleted
- Skipped employees are reported with detailed reasons
- Prevents data integrity issues

### Confirmation Dialog
- Requires user confirmation before sync
- Explains what will happen
- Prevents accidental syncs

### Transaction Safety
- Database operations wrapped in transaction
- Rollback on error
- All-or-nothing sync operation

## Testing Scenarios

### 1. New Employee Added to API
- **Expected**: Employee appears in local database
- **Result Count**: added_count +1

### 2. Employee Updated in API
- **Expected**: Employee name/number updated in local database
- **Result Count**: updated_count +1

### 3. Employee Removed from API (No Records)
- **Expected**: Employee soft-deleted (deleted_at set)
- **Result Count**: deleted_count +1

### 4. Employee Removed from API (Has Timesheet Records)
- **Expected**: Employee NOT deleted, added to skipped list
- **Result Count**: skipped_count +1
- **Reason**: "Has records: timesheet (X)"

### 5. Soft-Deleted Employee Returns to API
- **Expected**: deleted_at set back to NULL, employee restored
- **Result Count**: updated_count +1

### 6. API Error or Network Failure
- **Expected**: Error message shown, no changes to database
- **Transaction**: Rolled back

## Files Modified

### Backend:
1. `backend/create_schema.py` - Added deleted_at column to schema
2. `backend/migrate_add_deleted_at.py` - NEW: Migration script
3. `backend/database.py` - Added employee query methods and filters
4. `backend/bridge.py` - Added syncEmployeesFromAPIWithCleanup method

### Frontend:
1. `frontend/src/services/api.js` - Added syncEmployeesWithCleanup method
2. `frontend/src/components/EmployeeList.vue` - Added refresh button and dialogs

## Future Enhancements

1. **Scheduled Auto-Sync**: Add option to sync automatically every X hours
2. **Sync History**: Track sync operations with timestamps and results
3. **Restore Deleted Employees**: Add UI to manually restore soft-deleted employees
4. **Overtime/Leave Record Checks**: Add checks for overtime and leave applications
5. **Sync Notifications**: Add toast notifications instead of alerts
6. **Partial Sync**: Allow syncing specific employees instead of full sync
7. **Conflict Resolution**: Handle cases where local changes conflict with API data

## Notes

- The existing `syncEmployeesFromAPI()` method (used during login) was left unchanged
- This ensures backward compatibility and safe login behavior
- The new method is specifically for manual refresh operations
- Migration script must be run before using the feature: `python backend/migrate_add_deleted_at.py`
