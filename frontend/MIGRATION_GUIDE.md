# API Service Migration Guide

## Overview

The API service layer has been refactored from a single 2,353-line file into a modular, maintainable architecture. **All existing code continues to work** thanks to a backward compatibility layer.

## What Changed?

### Before (Old Structure)
```
services/
└── api.js (2,353 lines - everything in one file)
```

### After (New Structure)
```
services/
├── http-client.js               # Core HTTP logic
├── api.js                       # Backward compatibility layer
├── api.old.js                   # Original file (archived)
└── api/
    ├── index.js                 # Main exports
    ├── base.service.js          # Generic CRUD
    ├── auth.service.js          # Authentication
    ├── employee.service.js      # Employees
    ├── timesheet.service.js     # Timesheets
    ├── overtime.service.js      # Overtime
    ├── holiday.service.js       # Holiday
    ├── restday.service.js       # Restday
    ├── undertime.service.js     # Undertime
    └── leave.service.js         # Leave
```

## Migration Options

### Option 1: Do Nothing (Recommended for Now)

**All existing code continues to work!**

```javascript
// This still works exactly as before
import apiService from '@/services/api'

const result = await apiService.login(email, password)
const apps = await apiService.getOvertimeApplications(params)
```

✅ No changes needed
✅ Zero risk
✅ Gives you time to learn the new API

### Option 2: Gradual Migration (Best Practice)

Migrate components one at a time to the new API:

```javascript
// Old way
import apiService from '@/services/api'
await apiService.getOvertimeApplications(params)

// New way
import { overtimeService } from '@/services/api'
await overtimeService.getAll(params)
```

**Benefits:**
- Cleaner imports
- Better tree-shaking
- More explicit
- Future-proof

### Option 3: Full Migration (Advanced)

For new components, use the new service architecture directly:

```javascript
import authService from '@/services/api/auth.service'
import overtimeService from '@/services/api/overtime.service'

// Very clear what's being used
const user = await authService.login(email, password)
const apps = await overtimeService.getAll(params)
```

## API Method Mapping

### Authentication

| Old Method | New Method |
|-----------|-----------|
| `apiService.login(email, password)` | `authService.login(email, password)` |
| `apiService.logout()` | `authService.logout()` |
| `apiService.verifyToken()` | `authService.verifyToken()` |
| `apiService.getUserInfo()` | `authService.getUserInfo()` |
| `apiService.clearTokens()` | `authService.clearTokens()` |

### Employees

| Old Method | New Method |
|-----------|-----------|
| `apiService.getEmployeesTimekeeper()` | `employeeService.getEmployeesTimekeeper()` |
| `apiService.syncEmployeesWithCleanup()` | `employeeService.syncEmployeesWithCleanup()` |

### Timesheets

| Old Method | New Method |
|-----------|-----------|
| `apiService.createTimesheet(...)` | `timesheetService.createTimesheet(...)` |
| `apiService.getUnsyncedTimesheetsCount()` | `timesheetService.getUnsyncedTimesheetsCount()` |
| `apiService.syncTimesheetsToBackend()` | `timesheetService.syncTimesheetsToBackend()` |

### Overtime Applications

| Old Method | New Method |
|-----------|-----------|
| `apiService.getOvertimeApplications(params)` | `overtimeService.getAll(params)` |
| `apiService.createOvertimeApplication(data)` | `overtimeService.create(data)` |
| `apiService.getOvertimeById(id)` | `overtimeService.getById(id)` |
| `apiService.updateOvertimeApplication(id, data)` | `overtimeService.update(id, data)` |
| `apiService.deleteOvertimeApplication(id)` | `overtimeService.delete(id)` |
| `apiService.approveOvertimeApplication(id, data)` | `overtimeService.approve(id, data)` |
| `apiService.disapproveOvertimeApplication(id, remarks)` | `overtimeService.disapprove(id, remarks)` |
| `apiService.cancelOvertimeApplication(id, remarks)` | `overtimeService.cancel(id, remarks)` |
| `apiService.exportOvertimeToCSV(params)` | `overtimeService.exportToCSV(params)` |

### Holiday Applications

| Old Method | New Method |
|-----------|-----------|
| `apiService.getHolidayApplications(params)` | `holidayService.getAll(params)` |
| `apiService.createHolidayApplication(data)` | `holidayService.create(data)` |
| `apiService.getHolidayById(id)` | `holidayService.getById(id)` |
| `apiService.updateHolidayApplication(id, data)` | `holidayService.update(id, data)` |
| `apiService.deleteHolidayApplication(id)` | `holidayService.delete(id)` |
| `apiService.cancelHolidayApplication(id, remarks)` | `holidayService.cancel(id, remarks)` |
| `apiService.exportHolidayToCSV(params)` | `holidayService.exportToCSV(params)` |

### Restday Applications

| Old Method | New Method |
|-----------|-----------|
| `apiService.getRestdayApplications(params)` | `restdayService.getAll(params)` |
| `apiService.createRestdayApplication(data)` | `restdayService.create(data)` |
| `apiService.getRestdayById(id)` | `restdayService.getById(id)` |
| `apiService.updateRestdayApplication(id, data)` | `restdayService.update(id, data)` |
| `apiService.deleteRestdayApplication(id)` | `restdayService.delete(id)` |
| `apiService.cancelRestdayApplication(id, remarks)` | `restdayService.cancel(id, remarks)` |
| `apiService.exportRestdayToCSV(params)` | `restdayService.exportToCSV(params)` |

### Undertime Applications

| Old Method | New Method |
|-----------|-----------|
| `apiService.getUndertimeApplications(params)` | `undertimeService.getAll(params)` |
| `apiService.createUndertimeApplication(data)` | `undertimeService.create(data)` |
| `apiService.getUndertimeById(id)` | `undertimeService.getById(id)` |
| `apiService.updateUndertimeApplication(id, data)` | `undertimeService.update(id, data)` |
| `apiService.deleteUndertimeApplication(id)` | `undertimeService.delete(id)` |
| `apiService.cancelUndertimeApplication(id, remarks)` | `undertimeService.cancel(id, remarks)` |
| `apiService.exportUndertimeToCSV(params)` | `undertimeService.exportToCSV(params)` |

### Leave Applications

| Old Method | New Method |
|-----------|-----------|
| `apiService.getLeaveTypes()` | `leaveService.getLeaveTypes()` |
| `apiService.getLeaveApplications(params)` | `leaveService.getAll(params)` |
| `apiService.createLeaveApplication(data)` | `leaveService.create(data)` |
| `apiService.getLeaveById(id)` | `leaveService.getById(id)` |
| `apiService.updateLeaveApplication(id, data)` | `leaveService.update(id, data)` |
| `apiService.deleteLeaveApplication(id)` | `leaveService.delete(id)` |
| `apiService.cancelLeaveApplication(id, remarks)` | `leaveService.cancel(id, remarks)` |
| `apiService.exportLeaveToCSV(params)` | `leaveService.exportToCSV(params)` |

## Example: Migrating a Component

### Before (Using Old API)

```vue
<script>
import apiService from '@/services/api'

export default {
  data() {
    return {
      applications: [],
      loading: false
    }
  },

  async mounted() {
    await this.loadApplications()
  },

  methods: {
    async loadApplications() {
      this.loading = true
      try {
        const result = await apiService.getOvertimeApplications({
          page: 1,
          limit: 10,
          status: 'pending'
        })

        if (result.success) {
          this.applications = result.data
        }
      } catch (error) {
        console.error('Error loading applications:', error)
      } finally {
        this.loading = false
      }
    },

    async approveApplication(id) {
      const result = await apiService.approveOvertimeApplication(id, {
        approved_time_hours: 8,
        approved_time_minutes: 0,
        approved_remarks: 'Approved'
      })

      if (result.success) {
        await this.loadApplications()
      }
    }
  }
}
</script>
```

### After (Using New API)

```vue
<script>
import { overtimeService } from '@/services/api'

export default {
  data() {
    return {
      applications: [],
      loading: false
    }
  },

  async mounted() {
    await this.loadApplications()
  },

  methods: {
    async loadApplications() {
      this.loading = true
      try {
        const result = await overtimeService.getAll({
          page: 1,
          limit: 10,
          status: 'pending'
        })

        if (result.success) {
          this.applications = result.data
        }
      } catch (error) {
        console.error('Error loading applications:', error)
      } finally {
        this.loading = false
      }
    },

    async approveApplication(id) {
      const result = await overtimeService.approve(id, {
        approved_time_hours: 8,
        approved_time_minutes: 0,
        approved_remarks: 'Approved'
      })

      if (result.success) {
        await this.loadApplications()
      }
    }
  }
}
</script>
```

### What Changed?

1. **Import**: Changed from `apiService` to `{ overtimeService }`
2. **Method Names**: More consistent (all use `.getAll()`, `.create()`, etc.)
3. **Clarity**: Immediately clear we're working with overtime service
4. **Bundle Size**: Only imports overtime service, not all services

## Benefits of Migrating

### 1. Better Code Organization
```javascript
// Old: Hard to know what's being used
import apiService from '@/services/api'

// New: Clear what's being imported
import { overtimeService, leaveService } from '@/services/api'
```

### 2. Better Tree-Shaking
- Old API imports everything (2,353 lines)
- New API imports only what you need (~200 lines)
- Result: Smaller bundle size

### 3. Better IDE Support
- Autocomplete works better
- Faster "go to definition"
- Better type inference (if using TypeScript)

### 4. Better Testing
```javascript
// Easy to mock individual services
jest.mock('@/services/api/overtime.service', () => ({
  default: {
    getAll: jest.fn(),
    create: jest.fn()
  }
}))
```

### 5. Consistent Method Names
- All services use: `getAll`, `getById`, `create`, `update`, `delete`, `cancel`
- Easier to remember
- More predictable

## Common Patterns

### Pattern 1: Using Multiple Services

```javascript
import { authService, overtimeService, leaveService } from '@/services/api'

export default {
  methods: {
    async initialize() {
      // Check authentication
      const isAuth = await authService.verifyToken()

      if (isAuth) {
        // Load data from multiple services
        const [overtime, leave] = await Promise.all([
          overtimeService.getAll({ status: 'pending' }),
          leaveService.getAll({ status: 'pending' })
        ])
      }
    }
  }
}
```

### Pattern 2: Error Handling

```javascript
import { overtimeService } from '@/services/api'

try {
  const result = await overtimeService.create(data)

  if (result.success) {
    this.showSuccess('Created successfully')
  } else {
    this.showError(result.message)
  }
} catch (error) {
  // Network errors or unexpected failures
  this.showError('An unexpected error occurred')
}
```

### Pattern 3: Composables

```javascript
// composables/useOvertime.js
import { ref } from 'vue'
import { overtimeService } from '@/services/api'

export function useOvertime() {
  const applications = ref([])
  const loading = ref(false)

  async function loadApplications(params) {
    loading.value = true
    try {
      const result = await overtimeService.getAll(params)
      if (result.success) {
        applications.value = result.data
      }
    } finally {
      loading.value = false
    }
  }

  return {
    applications,
    loading,
    loadApplications
  }
}
```

## FAQ

### Q: Do I need to update my existing code?
**A:** No! All existing code continues to work. The old `apiService` import still functions exactly as before.

### Q: Should I migrate all components at once?
**A:** No, migrate gradually. Start with new components, then migrate existing ones as you work on them.

### Q: What if I find a bug after migration?
**A:** You can always import from `apiService` temporarily while the issue is fixed. Both APIs work simultaneously.

### Q: Can I delete api.old.js?
**A:** Keep it for reference during the migration period. Once all components are verified working, you can delete it.

### Q: Which import style should I use?
**A:** For new code, use `import { serviceName } from '@/services/api'`. It provides the best balance of clarity and convenience.

### Q: Do all methods work the same way?
**A:** Yes! The behavior is identical. Only the import path and method names have changed.

## Timeline

### Immediate (Now)
- ✅ All existing code works without changes
- ✅ New code can use new service architecture
- ✅ Build process works correctly

### Short Term (Next 1-2 weeks)
- New components use new API
- Gradually migrate existing components
- Learn new patterns and methods

### Long Term (1-2 months)
- All components migrated to new API
- Delete api.old.js reference file
- Remove backward compatibility layer (optional)

## Getting Help

### Finding the Right Service

**Authentication & User:**
```javascript
import { authService } from '@/services/api'
// login, logout, getUserInfo, verifyToken
```

**Employees:**
```javascript
import { employeeService } from '@/services/api'
// getEmployeesTimekeeper, syncEmployeesWithCleanup
```

**Timesheets:**
```javascript
import { timesheetService } from '@/services/api'
// createTimesheet, syncTimesheetsToBackend
```

**Applications (Overtime, Holiday, Restday, Undertime, Leave):**
```javascript
import { overtimeService } from '@/services/api'
import { holidayService } from '@/services/api'
import { restdayService } from '@/services/api'
import { undertimeService } from '@/services/api'
import { leaveService } from '@/services/api'
// All have: getAll, getById, create, update, delete, cancel, exportToCSV
```

### Service Method Reference

Check the individual service files:
- `services/api/auth.service.js`
- `services/api/employee.service.js`
- `services/api/timesheet.service.js`
- `services/api/overtime.service.js`
- `services/api/holiday.service.js`
- `services/api/restday.service.js`
- `services/api/undertime.service.js`
- `services/api/leave.service.js`

Each file has JSDoc comments explaining all methods.

## Summary

✅ **Backward Compatible** - All existing code works
✅ **Gradual Migration** - Migrate at your own pace
✅ **Better Organization** - Clear service separation
✅ **Smaller Bundles** - Better tree-shaking
✅ **Easier Testing** - Mock individual services
✅ **Consistent API** - Predictable method names

**Recommendation:** Keep using the old API for now, and start using the new API for any new components. Gradually migrate existing components as you work on them.

---

**Questions?** Check `REFACTORING_COMPLETED.md` for technical details or `REFACTORING_PLAN.md` for the overall strategy.
