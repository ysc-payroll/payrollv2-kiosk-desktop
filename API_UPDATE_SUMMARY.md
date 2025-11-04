# API Integration Update - /api/auth/user/ Implementation

## Overview
Updated the login flow to call `/api/auth/user/` after successful authentication to retrieve complete user profile, company information, permissions, and roles.

## What Changed

### 1. **API Service** (`frontend/src/services/api.js`)

#### New Method: `getUserInfo()`
```javascript
async getUserInfo()
```
- **Purpose**: Fetch complete user and company data after login
- **Endpoint**: `GET /api/auth/user/`
- **Stores**:
  - Complete user data in `localStorage.user_data`
  - Company data in `localStorage.company_data`

#### New Method: `getCompanyData()`
```javascript
getCompanyData()
```
- **Purpose**: Retrieve stored company data from localStorage
- **Returns**: Company object or null

### 2. **Login Component** (`frontend/src/components/LoginView.vue`)

#### Updated Login Flow
After successful authentication:
1. Call `apiService.getUserInfo()`
2. Parse complete response with company, employee, roles, permissions
3. Emit enriched login-success event with:
   - Full user profile
   - Company information
   - Employee record
   - User roles
   - Permissions object

**Before:**
```javascript
emit('login-success', {
  user: { id, email, name },
  hasAdminAccess,
  hasEmployeeAccess
})
```

**After:**
```javascript
emit('login-success', {
  user: { id, email, name, firstName, lastName, isSuperuser, isStaff },
  company: { id, name, slug, address, timezone, ... },
  employee: { id, system_id, first_name, position, department },
  roles: [...],
  permissions: { employees: { read, write }, ... },
  hasAdminAccess,
  hasEmployeeAccess
})
```

### 3. **Main App** (`frontend/src/App.vue`)

#### New State Variables
```javascript
const companyData = ref(null)           // Complete company object
const currentUserPermissions = ref(null) // User permissions
```

#### Updated `handleLoginSuccess()`
- Stores complete company data in state
- Updates company name from API response
- Calls new `updateCompanyInDatabase()` to sync to SQLite
- Stores user permissions

#### Updated `checkAuthentication()`
- Restores company data from localStorage on app startup
- Restores user permissions if available
- Handles both old format (pk) and new format (id) for user ID

#### New Function: `updateCompanyInDatabase()`
```javascript
const updateCompanyInDatabase = async (company)
```
- Sends company data to Python bridge
- Syncs company info to local SQLite database

### 4. **Python Bridge** (`backend/bridge.py`)

#### New Method: `updateCompany(company_json)`
```python
@pyqtSlot(str, result=str)
def updateCompany(self, company_json)
```

**Purpose**: Update or insert company data in local database

**Logic**:
- Parse company JSON from API
- Extract: id, name, slug, address, contact_number, email
- Check if company exists (by backend_id)
- Update existing or insert new company record
- Return success/error status

**Database Operations**:
```sql
-- Check existing
SELECT id FROM company WHERE backend_id = ?

-- Update existing
UPDATE company SET name = ? WHERE backend_id = ?

-- Insert new
INSERT INTO company (backend_id, name) VALUES (?, ?)
```

## API Response Structure

### POST /api/auth/login/
```json
{
  "status": "success",
  "detail": "User logged in.",
  "has_admin_portal_access": true,
  "has_employee_portal_access": true,
  "jwt": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "pk": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### GET /api/auth/user/
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_superuser": false,
  "is_staff": false,
  "employee_portal_access": true,
  "admin_portal_access": true,
  "company": {
    "id": 1,
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "address": "123 Business Street, Manila",
    "contact_number": "+63 2 1234 5678",
    "email": "info@acmecorp.com",
    "timezone": "Asia/Manila",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "employee": {
    "id": 1,
    "system_id": 101,
    "first_name": "John",
    "last_name": "Doe",
    "middle_name": "Michael",
    "position": {
      "id": 1,
      "name": "Software Engineer"
    },
    "department": {
      "id": 1,
      "name": "IT Department"
    }
  },
  "roles": [
    {
      "id": 1,
      "name": "Manager",
      "description": "Department Manager"
    }
  ],
  "permissions": {
    "employees": {
      "read": true,
      "write": true,
      "delete": false
    },
    "payroll": {
      "read": true,
      "write": false,
      "delete": false
    }
  }
}
```

## Updated Login Flow

```
1. User enters email/password
   ↓
2. POST /api/auth/login/
   ↓
3. Receive JWT tokens
   ↓
4. Store access_token & refresh_token
   ↓
5. GET /api/auth/user/  ← NEW
   ↓
6. Receive complete profile
   ↓
7. Store company data in localStorage
   ↓
8. Update company in SQLite via bridge  ← NEW
   ↓
9. Store permissions in state  ← NEW
   ↓
10. Sync employees from API
   ↓
11. Show welcome message
   ↓
12. Navigate to main kiosk screen
```

## Data Flow Diagram

```
API Response (/api/auth/user/)
    ↓
LoginView.vue (parse response)
    ↓
    ├─→ localStorage.user_data (complete user profile)
    ├─→ localStorage.company_data (company info)
    └─→ emit('login-success', enrichedData)
        ↓
        App.vue (handleLoginSuccess)
        ↓
        ├─→ companyData.value (Vue state)
        ├─→ companyName.value (displayed in UI)
        ├─→ currentUserPermissions.value (for authorization)
        └─→ updateCompanyInDatabase()
            ↓
            bridge.updateCompany()
            ↓
            SQLite: company table updated
```

## Benefits

### 1. **Rich User Context**
- Access to full user profile
- Company information available immediately
- User roles and permissions for authorization

### 2. **Company Branding**
- Company name displayed in top navigation
- Company timezone for time logging
- Company contact info available

### 3. **Permission-Based Features**
- Can enable/disable features based on permissions
- Role-based access control ready
- Future-proof for feature restrictions

### 4. **Employee Linking**
- User account linked to employee record
- Access to employee's system_id, position, department
- Can show personalized employee information

### 5. **Multi-Tenant Ready**
- Company isolation enforced
- Each user tied to specific company
- Company data synced to local database

## Storage Locations

| Data | Location | Purpose |
|------|----------|---------|
| Access Token | `localStorage.access_token` | API authentication |
| Refresh Token | `localStorage.refresh_token` | Token renewal |
| User Data | `localStorage.user_data` | Complete user profile |
| Company Data | `localStorage.company_data` | Company information |
| Company Name | Vue: `companyData.value` | UI display |
| Permissions | Vue: `currentUserPermissions.value` | Authorization |
| Company | SQLite: `company` table | Local database |

## Testing

### Test Login Flow
1. Login with valid credentials
2. Check browser console for:
   ```
   GET /api/auth/user/ → 200 OK
   Company data synced to database
   ```
3. Verify localStorage:
   ```javascript
   localStorage.getItem('company_data')
   // Should show complete company object
   ```
4. Check top navigation shows company name

### Test Session Restore
1. Login successfully
2. Close application
3. Reopen application
4. Should show company name immediately
5. No additional API calls needed

### Test Database Sync
1. Login successfully
2. Check SQLite database:
   ```bash
   sqlite3 backend/database/kiosk.db
   SELECT * FROM company;
   ```
3. Should show company with correct backend_id and name

## Future Enhancements

- [ ] Use company timezone for timestamp conversions
- [ ] Display company logo if available in API
- [ ] Show user's employee position in UI
- [ ] Implement permission-based feature gating
- [ ] Add role-based sidebar menu items
- [ ] Use company contact info in settings
- [ ] Support company-specific themes/branding

## Migration Notes

### Backward Compatibility
- Old login flow still works if `/api/auth/user/` fails
- Falls back to basic user data from login response
- No breaking changes to existing functionality

### Testing Checklist
- [x] Login with valid credentials
- [x] Company name displays in top nav
- [x] Company data stored in localStorage
- [x] Company synced to SQLite database
- [x] Session restored on app restart
- [x] Employee sync still works
- [ ] Test with different company accounts
- [ ] Test with users having different permissions
- [ ] Test with users not linked to employee records

---

**Last Updated**: 2025-11-03
**API Version**: v1.1
**App Version**: v2.0.0
