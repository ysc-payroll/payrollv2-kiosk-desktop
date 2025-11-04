# Actual API Response Mapping

## Overview
This document describes how the actual API response from `/api/auth/user/` is mapped to our application's expected format.

## Actual API Response Structure

### GET /api/auth/user/
```json
{
    "id": 395,
    "first_name": "",
    "last_name": "",
    "email": "zip1@gmail.com",
    "company_id": 25,
    "company_name": "ZIP1",
    "rights": {
        "requests_holiday": ["create", "delete", "edit", "read"],
        "requests_leave": ["create", "delete", "edit", "read"],
        "requests_overtime": ["create", "delete", "edit", "read"],
        "requests_restday": ["create", "delete", "edit", "read"],
        "requests_timesheet": ["create", "delete", "edit", "read"],
        "requests_undertime": ["create", "delete", "edit", "read"],
        "timesheets_daily_timesheets": ["create", "delete", "edit", "read"]
    },
    "is_superuser": false,
    "portal_access_type": "admin_only",
    "can_switch_portals": false,
    "employee_id": null,
    "has_admin_portal_access": true,
    "has_employee_portal_access": false
}
```

## Key Differences from Expected Format

| Expected | Actual | Notes |
|----------|--------|-------|
| `company: { id, name }` | `company_id`, `company_name` | Flat structure instead of nested |
| `employee: { id, system_id }` | `employee_id` | Single field, may be null |
| `permissions: { resource: { read, write } }` | `rights: { resource: ["read", "write"] }` | Array format instead of object |
| `is_staff` | Not provided | Defaults to false |
| `roles: []` | Not provided | Defaults to empty array |

## Response Mapping Logic

### API Service Mapping (`frontend/src/services/api.js`)

```javascript
const mappedData = {
  // User fields
  id: response.id,
  email: response.email,
  first_name: response.first_name || '',
  last_name: response.last_name || '',
  is_superuser: response.is_superuser,
  is_staff: false,

  // Map flat company to nested object
  company: {
    id: response.company_id,
    name: response.company_name
  },

  // Map employee_id (may be null)
  employee: response.employee_id ? {
    id: response.employee_id,
    system_id: response.employee_id
  } : null,

  // Map rights array format to permissions object
  permissions: {
    requests_holiday: {
      create: true,
      read: true,
      edit: true,
      delete: true
    },
    // ... other resources
  },

  // Portal access
  admin_portal_access: response.has_admin_portal_access,
  employee_portal_access: response.has_employee_portal_access,
  portal_access_type: response.portal_access_type,
  can_switch_portals: response.can_switch_portals,

  // Keep original for reference
  rights: response.rights,
  _original: response
}
```

## Rights to Permissions Mapping

### Input (Rights)
```json
{
  "requests_holiday": ["create", "delete", "edit", "read"],
  "timesheets_daily_timesheets": ["create", "delete", "edit", "read"]
}
```

### Output (Permissions)
```json
{
  "requests_holiday": {
    "create": true,
    "delete": true,
    "edit": true,
    "read": true
  },
  "timesheets_daily_timesheets": {
    "create": true,
    "delete": true,
    "edit": true,
    "read": true
  }
}
```

### Mapping Function
```javascript
_mapRightsToPermissions(rights) {
  const permissions = {}

  for (const [resource, actions] of Object.entries(rights)) {
    permissions[resource] = {
      create: actions.includes('create'),
      read: actions.includes('read'),
      edit: actions.includes('edit'),
      delete: actions.includes('delete')
    }
  }

  return permissions
}
```

## Display Name Handling

Since `first_name` and `last_name` can be empty strings:

```javascript
let displayName = `${userData.first_name} ${userData.last_name}`.trim()
if (!displayName) {
  displayName = userData.email // Fallback to email
}
```

**Example:**
- `first_name: ""`, `last_name: ""` → Display: `"zip1@gmail.com"`
- `first_name: "John"`, `last_name: "Doe"` → Display: `"John Doe"`

## Employee ID Handling

```javascript
employee: response.employee_id ? {
  id: response.employee_id,
  system_id: response.employee_id
} : null
```

**Cases:**
- `employee_id: null` → `employee: null`
- `employee_id: 123` → `employee: { id: 123, system_id: 123 }`

## Portal Access Mapping

| API Field | Mapped Field | Type | Example |
|-----------|-------------|------|---------|
| `has_admin_portal_access` | `hasAdminAccess` | boolean | `true` |
| `has_employee_portal_access` | `hasEmployeeAccess` | boolean | `false` |
| `portal_access_type` | `portalAccessType` | string | `"admin_only"` |
| `can_switch_portals` | `canSwitchPortals` | boolean | `false` |

## Data Storage

### localStorage Keys

| Key | Content | Structure |
|-----|---------|-----------|
| `user_data` | Complete mapped user data | Mapped object with all fields |
| `company_data` | Company object | `{ id: 25, name: "ZIP1" }` |
| `access_token` | JWT access token | String |
| `refresh_token` | JWT refresh token | String |

### Vue State

| State Variable | Content | Example |
|----------------|---------|---------|
| `currentUser` | User profile | `{ id: 395, email, name }` |
| `companyData` | Company object | `{ id: 25, name: "ZIP1" }` |
| `companyName` | Company name string | `"ZIP1"` |
| `currentUserPermissions` | Mapped permissions | `{ requests_holiday: { read: true } }` |

### SQLite Database

```sql
-- company table
backend_id | name
25         | ZIP1
```

## Complete Data Flow

```
1. POST /api/auth/login/
   ↓
2. Store JWT tokens
   ↓
3. GET /api/auth/user/
   ↓
4. Receive flat response
   ↓
5. Map to nested structure (API Service)
   ↓
6. Store in localStorage
   {
     user_data: mapped user object,
     company_data: { id, name }
   }
   ↓
7. Emit to App.vue
   ↓
8. Update Vue state
   - currentUser
   - companyData
   - companyName
   - currentUserPermissions
   ↓
9. Sync company to SQLite
   ↓
10. Display in UI
```

## Example: Complete Login Response

### What App Receives After Mapping

```javascript
{
  user: {
    id: 395,
    email: "zip1@gmail.com",
    name: "zip1@gmail.com", // Fallback to email since names empty
    firstName: "",
    lastName: "",
    isSuperuser: false,
    isStaff: false
  },
  company: {
    id: 25,
    name: "ZIP1"
  },
  employee: null, // employee_id was null
  roles: [],
  permissions: {
    requests_holiday: {
      create: true,
      read: true,
      edit: true,
      delete: true
    },
    requests_leave: {
      create: true,
      read: true,
      edit: true,
      delete: true
    },
    // ... other permissions
  },
  rights: {
    // Original rights object preserved
  },
  portalAccessType: "admin_only",
  canSwitchPortals: false,
  hasAdminAccess: true,
  hasEmployeeAccess: false
}
```

## Available Resources with Permissions

Based on your actual API response, these resources are available:

1. `requests_holiday` - Holiday requests
2. `requests_leave` - Leave requests
3. `requests_overtime` - Overtime requests
4. `requests_restday` - Rest day requests
5. `requests_timesheet` - Timesheet requests
6. `requests_undertime` - Undertime requests
7. `timesheets_daily_timesheets` - Daily timesheets

All have full CRUD permissions: `["create", "delete", "edit", "read"]`

## Checking Permissions in Code

```javascript
// Check if user can create holiday requests
if (currentUserPermissions.value?.requests_holiday?.create) {
  // Show create button
}

// Check if user can edit timesheets
if (currentUserPermissions.value?.timesheets_daily_timesheets?.edit) {
  // Enable edit functionality
}

// Check portal access
if (data.hasAdminAccess) {
  // Show admin features
}
```

## Testing

### Verify Mapping in Console

```javascript
// After login, check localStorage
JSON.parse(localStorage.getItem('user_data'))

// Should show:
{
  id: 395,
  email: "zip1@gmail.com",
  company: { id: 25, name: "ZIP1" },
  permissions: { requests_holiday: { create: true, ... } }
}

// Check company data
JSON.parse(localStorage.getItem('company_data'))
// { id: 25, name: "ZIP1" }
```

### Verify Database Sync

```bash
sqlite3 backend/database/kiosk.db
SELECT * FROM company WHERE backend_id = 25;
# Should show: 25 | ZIP1
```

### Verify UI Display

- Top navigation should show: **"ZIP1"**
- User dropdown should show: **"zip1@gmail.com"**

---

**Last Updated**: 2025-11-03
**API Version**: v1.1 (Actual)
**App Version**: v2.0.0
