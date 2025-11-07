# Frontend Refactoring Plan

## Current State Analysis

### File Statistics
- **api.js**: 2,353 lines (MASSIVE - needs splitting)
- **App.vue**: 1,778 lines (very large)
- **EmployeeList.vue**: 592 lines
- Multiple form dialogs: ~439 lines each (repetitive code)
- Multiple view components: ~325 lines each (similar patterns)

### API Service Structure (api.js)

The api.js file contains **53 async methods** grouped by domain:

1. **Authentication** (5 methods)
   - login, refreshAccessToken, verifyToken, logout, getUserInfo

2. **Employee Management** (2 methods)
   - getEmployeesTimekeeper, syncEmployeesWithCleanup

3. **Timesheet** (3 methods)
   - createTimesheet, getUnsyncedTimesheetsCount, syncTimesheetsToBackend

4. **Overtime** (11 methods)
   - getOvertimeApplications, createOvertimeApplication, getOvertimeById
   - updateOvertimeApplication, deleteOvertimeApplication
   - reviewOvertimeApplication, approveOvertimeApplication, disapproveOvertimeApplication
   - cancelOvertimeApplication, getOvertimeAttachment, replaceOvertimeAttachment
   - exportOvertimeToCSV

5. **Holiday** (7 methods)
   - getHolidayApplications, createHolidayApplication, getHolidayById
   - updateHolidayApplication, deleteHolidayApplication
   - cancelHolidayApplication, exportHolidayToCSV

6. **Restday** (7 methods)
   - getRestdayApplications, getRestdayById, createRestdayApplication
   - updateRestdayApplication, deleteRestdayApplication
   - cancelRestdayApplication, exportRestdayToCSV

7. **Undertime** (7 methods)
   - getUndertimeApplications, getUndertimeById, createUndertimeApplication
   - updateUndertimeApplication, deleteUndertimeApplication
   - cancelUndertimeApplication, exportUndertimeToCSV

8. **Leave** (8 methods)
   - getLeaveTypes, getLeaveApplications, getLeaveById
   - createLeaveApplication, updateLeaveApplication
   - deleteLeaveApplication, cancelLeaveApplication, exportLeaveToCSV

## Problems Identified

### 1. Single Responsibility Violation
- api.js handles authentication, employees, timesheets, and 5 different application types
- Each module (overtime, holiday, restday, undertime, leave) has nearly identical CRUD operations
- Massive file is hard to maintain and navigate

### 2. Code Duplication
**Form Dialogs** - Almost identical structure:
- `OvertimeFormDialog.vue` (439 lines)
- `HolidayFormDialog.vue` (439 lines)
- `RestdayFormDialog.vue` (439 lines)
- `UndertimeFormDialog.vue` (439 lines)
- `LeaveFormDialog.vue` (486 lines)

**View Components** - Similar patterns:
- `OvertimeView.vue` (363 lines)
- `HolidayView.vue` (325 lines)
- `RestdayView.vue` (325 lines)
- `UndertimeView.vue` (325 lines)
- `LeaveView.vue` (333 lines)

**Composables** - Similar logic:
- `useOvertimeManagement.js` (311 lines)
- `useHolidayManagement.js` (311 lines)
- `useRestdayManagement.js` (311 lines)
- `useUndertimeManagement.js` (311 lines)
- `useLeaveManagement.js` (326 lines)

### 3. Missing Abstraction
- No base API client class
- No generic CRUD service
- No base form component
- No base table component
- Each resource type reimplements the same patterns

## Refactoring Strategy

### Phase 1: Split API Service (HIGH PRIORITY)

**Goal**: Break api.js into multiple focused modules

**New Structure**:
```
frontend/src/services/
├── api/
│   ├── index.js                    # Main export and ApiService class
│   ├── auth.service.js             # Authentication methods
│   ├── employee.service.js         # Employee operations
│   ├── timesheet.service.js        # Timesheet operations
│   ├── overtime.service.js         # Overtime CRUD
│   ├── holiday.service.js          # Holiday CRUD
│   ├── restday.service.js          # Restday CRUD
│   ├── undertime.service.js        # Undertime CRUD
│   ├── leave.service.js            # Leave CRUD
│   └── base.service.js             # Base CRUD operations (DRY)
└── http-client.js                  # HTTP client with auth/retry logic
```

**Benefits**:
- Each file ~200-400 lines (manageable)
- Easy to find specific functionality
- Can import only what you need
- Easier testing (one service at a time)

### Phase 2: Create Generic CRUD Service (MEDIUM PRIORITY)

**Goal**: Eliminate duplicated CRUD operations

**Base CRUD Service**:
```javascript
// services/api/base.service.js
export class BaseCrudService {
  constructor(httpClient, endpoint) {
    this.http = httpClient
    this.endpoint = endpoint
  }

  async getAll(params = {}) {
    return this.http.get(`${this.endpoint}/`, { params })
  }

  async getById(id) {
    return this.http.get(`${this.endpoint}/${id}/`)
  }

  async create(data) {
    return this.http.post(`${this.endpoint}/`, data)
  }

  async update(id, data) {
    return this.http.patch(`${this.endpoint}/${id}/`, data)
  }

  async delete(id) {
    return this.http.delete(`${this.endpoint}/${id}/`)
  }

  async cancel(id) {
    return this.http.post(`${this.endpoint}/${id}/cancel/`)
  }

  async exportToCSV(params = {}) {
    return this.http.get(`${this.endpoint}/export/`, { params })
  }
}
```

**Usage**:
```javascript
// services/api/overtime.service.js
import { BaseCrudService } from './base.service'

export class OvertimeService extends BaseCrudService {
  constructor(httpClient) {
    super(httpClient, '/api/overtime/applications')
  }

  // Only add methods specific to overtime
  async approve(id, data) {
    return this.http.post(`${this.endpoint}/${id}/approve/`, data)
  }

  async disapprove(id, data) {
    return this.http.post(`${this.endpoint}/${id}/disapprove/`, data)
  }

  async getAttachment(id) {
    return this.http.get(`${this.endpoint}/${id}/attachment/`)
  }
}
```

**Impact**: Reduces ~70% of repetitive code in services

### Phase 3: Abstract Form Components (MEDIUM PRIORITY)

**Goal**: Create reusable form dialog component

**Generic Form Dialog**:
```javascript
// components/common/ApplicationFormDialog.vue
<template>
  <dialog-wrapper :visible="visible" :title="title" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <!-- Dynamic form fields based on schema -->
      <component
        v-for="field in schema.fields"
        :key="field.name"
        :is="getFieldComponent(field.type)"
        v-model="formData[field.name]"
        v-bind="field.props"
      />

      <div class="actions">
        <button type="button" @click="$emit('close')">Cancel</button>
        <button type="submit">{{ submitLabel }}</button>
      </div>
    </form>
  </dialog-wrapper>
</template>

<script setup>
// Generic form handling logic
const props = defineProps({
  visible: Boolean,
  schema: Object,  // Form field definitions
  initialData: Object,
  submitLabel: { type: String, default: 'Submit' }
})

const emit = defineEmits(['close', 'submit'])
// ... form logic
</script>
```

**Usage**:
```javascript
// components/overtime/OvertimeFormDialog.vue (much smaller now)
<template>
  <ApplicationFormDialog
    :visible="visible"
    :schema="overtimeFormSchema"
    :initial-data="overtimeData"
    @submit="handleSubmit"
    @close="$emit('close')"
  />
</template>

<script setup>
const overtimeFormSchema = {
  fields: [
    { name: 'date', type: 'date', props: { label: 'Date', required: true } },
    { name: 'hours', type: 'number', props: { label: 'Hours', min: 0, max: 24 } },
    { name: 'reason', type: 'textarea', props: { label: 'Reason', rows: 4 } }
  ]
}
</script>
```

**Impact**: Reduces form dialogs from ~439 lines to ~100 lines each

### Phase 4: Generic Composable (LOW-MEDIUM PRIORITY)

**Goal**: Create reusable application management composable

**Base Composable**:
```javascript
// composables/useApplicationManagement.js
export function useApplicationManagement(service, options = {}) {
  const applications = ref([])
  const loading = ref(false)
  const error = ref(null)
  const selectedApp = ref(null)

  // Generic CRUD operations
  const fetchApplications = async (params) => { ... }
  const createApplication = async (data) => { ... }
  const updateApplication = async (id, data) => { ... }
  const deleteApplication = async (id) => { ... }
  const cancelApplication = async (id) => { ... }
  const exportToCSV = async (params) => { ... }

  return {
    applications,
    loading,
    error,
    selectedApp,
    fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    cancelApplication,
    exportToCSV
  }
}
```

**Usage**:
```javascript
// composables/useOvertimeManagement.js (simplified)
import { useApplicationManagement } from './useApplicationManagement'
import { overtimeService } from '@/services/api'

export function useOvertimeManagement() {
  const base = useApplicationManagement(overtimeService)

  // Add overtime-specific methods
  const approveOvertime = async (id, data) => {
    // specific logic
  }

  return {
    ...base,
    approveOvertime,
    disapproveOvertime
  }
}
```

**Impact**: Reduces composables from ~311 lines to ~100 lines each

### Phase 5: Refactor App.vue (LOW PRIORITY)

**Goal**: Break down the 1,778 line App.vue

**Strategy**:
- Extract layout components (Sidebar, Header, Footer)
- Extract route-level components
- Move business logic to composables
- Use provide/inject for global state

**New Structure**:
```
components/
├── layout/
│   ├── AppLayout.vue
│   ├── Sidebar.vue
│   ├── Header.vue
│   └── Footer.vue
└── ...
```

## Implementation Roadmap

### Week 1: API Service Refactoring
- [ ] Create new services/ directory structure
- [ ] Extract HttpClient class
- [ ] Create BaseCrudService
- [ ] Split api.js into domain services
- [ ] Update all imports in components
- [ ] Test all API calls

**Files to Create**:
- `services/http-client.js` (~150 lines)
- `services/api/base.service.js` (~100 lines)
- `services/api/auth.service.js` (~200 lines)
- `services/api/employee.service.js` (~100 lines)
- `services/api/timesheet.service.js` (~150 lines)
- `services/api/overtime.service.js` (~150 lines)
- `services/api/holiday.service.js` (~100 lines)
- `services/api/restday.service.js` (~100 lines)
- `services/api/undertime.service.js` (~100 lines)
- `services/api/leave.service.js` (~120 lines)
- `services/api/index.js` (~50 lines - exports)

**Total**: ~1,320 lines across 11 files (vs 2,353 in one file)

### Week 2: Generic Components
- [ ] Create ApplicationFormDialog component
- [ ] Create form field components library
- [ ] Refactor overtime form to use generic component
- [ ] Refactor other forms one by one
- [ ] Create generic table component

### Week 3: Generic Composables
- [ ] Create useApplicationManagement composable
- [ ] Refactor overtime composable
- [ ] Refactor other composables
- [ ] Add comprehensive tests

### Week 4: App.vue Refactoring
- [ ] Extract layout components
- [ ] Move business logic to composables
- [ ] Clean up and optimize
- [ ] Final testing

## Expected Outcomes

### Code Metrics (After Refactoring)

**api.js (2,353 lines) → Multiple files**:
- Average file size: ~120 lines
- Easier to navigate and maintain
- Better code organization

**Form Dialogs (439 lines each) → Generic component**:
- Generic dialog: ~200 lines
- Each specific dialog: ~50-100 lines (just schema)
- 80% reduction in form code

**Composables (311 lines each) → Generic base**:
- Base composable: ~150 lines
- Each specific composable: ~50-100 lines
- 70% reduction in composable code

**Total LOC Reduction**: ~40-50% reduction in total lines of code

### Benefits

1. **Maintainability**
   - Easier to find specific functionality
   - Changes to CRUD operations affect all resources
   - Single source of truth for common patterns

2. **Testability**
   - Smaller, focused units to test
   - Can test base service once, benefits all services
   - Easier to mock dependencies

3. **Developer Experience**
   - Clear file organization
   - Less scrolling through massive files
   - Faster IDE performance
   - Better autocomplete

4. **Performance**
   - Tree-shaking works better with smaller modules
   - Only import what you need
   - Smaller bundle size

5. **Scalability**
   - Easy to add new resource types
   - Pattern is established and clear
   - Less duplication = less bugs

## Migration Strategy

### Backward Compatibility

During migration, maintain backward compatibility:

```javascript
// services/api.js (temporary compatibility layer)
import { authService } from './api/auth.service'
import { overtimeService } from './api/overtime.service'
// ... other imports

// Export old interface for backward compatibility
export default {
  login: (...args) => authService.login(...args),
  getOvertimeApplications: (...args) => overtimeService.getAll(...args),
  // ... map all old methods
}

// Also export new services
export { authService, overtimeService, /* ... */ }
```

### Gradual Migration

1. **Phase 1**: Create new services alongside old api.js
2. **Phase 2**: Update one component at a time to use new services
3. **Phase 3**: Once all components migrated, remove old api.js
4. **Phase 4**: Remove compatibility layer

## Risk Assessment

### Low Risk
- API service splitting (backward compatible)
- Creating base CRUD service (new code, doesn't affect existing)

### Medium Risk
- Generic form components (UI changes, needs thorough testing)
- Composable refactoring (state management changes)

### High Risk
- App.vue refactoring (core application structure)

**Mitigation**:
- Start with low-risk refactoring
- Comprehensive testing after each phase
- Feature flags for gradual rollout
- Keep git commits small and focused

## Testing Strategy

### Unit Tests
- Test each service independently
- Test base CRUD service thoroughly
- Test generic components with various schemas

### Integration Tests
- Test service → composable → component flow
- Test backward compatibility layer

### E2E Tests
- Test complete user flows
- Ensure no regressions after refactoring

## Conclusion

The frontend code has grown organically and now suffers from:
- **Massive files** (api.js = 2,353 lines)
- **High duplication** (5 nearly identical form/view/composable sets)
- **Low abstraction** (no base classes, no generic components)

**Recommended Approach**: Start with Phase 1 (API splitting) as it provides the most immediate benefit with the lowest risk. This can be done incrementally without affecting the UI.

After Phase 1 is stable, proceed to Phase 2-4 based on development priorities and available time.

**Estimated Effort**:
- Phase 1 (API): 16-24 hours
- Phase 2 (Generic CRUD): 8-12 hours
- Phase 3 (Generic Components): 16-24 hours
- Phase 4 (Composables): 12-16 hours
- Phase 5 (App.vue): 8-12 hours

**Total**: 60-88 hours (~2-3 weeks of focused work)

**ROI**: The time investment will pay off in:
- Faster feature development (less code to write)
- Fewer bugs (less duplication)
- Easier onboarding (clearer structure)
- Better performance (smaller bundles)
