# Overtime Module Structure

## Overview
The Overtime module allows employees to submit overtime applications and administrators to approve/disapprove them. This document serves as a reference for implementing similar modules (Leave, Holiday, Official Business, Restday, Undertime).

## Module Architecture

### Frontend Structure
```
frontend/src/
├── components/
│   ├── OvertimeView.vue              # Main container component
│   └── overtime/                      # Overtime-specific components
│       ├── OvertimeTable.vue          # Data table with actions
│       ├── OvertimeFormDialog.vue     # Create/Edit form modal
│       └── AttachmentDialog.vue       # Attachment viewer/uploader (shared)
├── composables/
│   └── useOvertimeManagement.js       # Business logic & state management
└── services/
    └── api.js                          # API service layer

```

### Backend Structure (API Endpoints)
```
/api/applications/overtime/                          # List & Create
/api/applications/overtime/{id}/                     # Get, Update, Delete
/api/applications/overtime/{id}/review/              # Mark as reviewed
/api/applications/overtime/{id}/approve/             # Approve application
/api/applications/overtime/{id}/disapprove/          # Disapprove application
/api/applications/overtime/{id}/cancel/              # Cancel application
/api/applications/overtime/{id}/attachment/          # Get attachment (302 redirect to MinIO)
/api/applications/overtime/{id}/attachment/info/     # Get attachment metadata
/api/applications/overtime/{id}/attachment/replace/  # Upload/Replace attachment
/api/applications/overtime/export/                   # Export to CSV
```

## Data Flow Pattern

### 1. Main View Component (`OvertimeView.vue`)

**Responsibilities:**
- Layout and UI structure
- Integrate composable for state management
- Handle modal dialogs (form, attachment)
- Coordinate between table and forms

**Key Features:**
- Header with record count and "New Request" button
- Filter section (date range, status, search)
- Pagination controls
- Export to CSV functionality

**State Management:**
```javascript
import { useOvertimeManagement } from '../composables/useOvertimeManagement'

const {
  overtimeApplications,    // List of records
  employees,               // Employee dropdown data
  isLoading,              // Loading state
  currentPage,            // Pagination
  totalRecords,
  filters,                // Filter state
  permissions,            // User permissions
  fetchOvertimeApplications,
  createOvertime,
  updateOvertime,
  exportToCSV
} = useOvertimeManagement()
```

### 2. Composable (`useOvertimeManagement.js`)

**Responsibilities:**
- Centralized state management (ref, computed)
- Business logic and data transformations
- API calls via service layer
- Permission handling
- Filter and pagination logic

**Key Sections:**
```javascript
// State
const overtimeApplications = ref([])
const employees = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const totalRecords = ref(0)

// Filters
const filters = reactive({
  status: 'all',
  application_date_from: '',
  application_date_to: '',
  search: ''
})

// Permissions (loaded from localStorage)
const permissions = computed(() => ({
  canCreate: hasPermission('overtime_application', 'create'),
  canRead: hasPermission('overtime_application', 'read'),
  canUpdate: hasPermission('overtime_application', 'edit'),
  canDelete: hasPermission('overtime_application', 'delete'),
  canSelectEmployee: !isEmployee.value // Admins can select employee
}))

// API Methods
const fetchOvertimeApplications = async () => { ... }
const createOvertime = async (data) => { ... }
const updateOvertime = async (id, data) => { ... }
const deleteOvertime = async (id) => { ... }
const exportToCSV = async () => { ... }
```

### 3. Data Table Component (`OvertimeTable.vue`)

**Responsibilities:**
- Display records in table format
- Action dropdown menu (Edit, View Attachment, etc.)
- Status badges with color coding
- Attachment indicator column

**Props:**
```javascript
{
  records: Array,        // List of overtime records
  isLoading: Boolean,   // Show loading spinner
  permissions: Object   // Control action visibility
}
```

**Emits:**
```javascript
emit('edit', record)              // Edit button clicked
emit('view-attachment', record)   // View attachment clicked
```

**Table Columns:**
1. Requested Date
2. Employee Name
3. OT Date (application_date)
4. Applied Time (hours:minutes)
5. Approved Time (hours:minutes or '-')
6. Reason
7. Status (with badge and timeline info)
8. Attachment Indicator (icon)
9. Actions Dropdown

**Status Styling:**
```javascript
const getStatusClass = (status) => {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  disapproved: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-800'
}
```

### 4. Form Dialog Component (`OvertimeFormDialog.vue`)

**Responsibilities:**
- Create new overtime application
- Edit existing application (pending only)
- File attachment upload
- Form validation

**Props:**
```javascript
{
  isOpen: Boolean,           // Control dialog visibility
  mode: String,              // 'create' or 'edit'
  selectedRecord: Object,    // Record data for edit mode
  employees: Array,          // Employee dropdown options
  canSelectEmployee: Boolean, // Show employee selector (admin only)
  isSaving: Boolean         // Show saving state
}
```

**Emits:**
```javascript
emit('close')                    // Close dialog
emit('submit', { mode, data })   // Submit form
```

**Form Fields:**
1. Employee (dropdown - admin only, pre-filled for employees)
2. Application Date (date picker)
3. Applied Time - Hours (number input)
4. Applied Time - Minutes (number input)
5. Reason (textarea)
6. Attachment (file upload - images only, max 10MB)

**Validation Rules:**
- Employee: Required
- Application Date: Required
- Applied Time: At least hours OR minutes must be > 0
- Reason: Optional
- Attachment: Optional, images only, max 10MB

**File Upload Format:**
```javascript
const formData = new FormData()
formData.append('employee', data.employee)
formData.append('application_date', data.application_date)
formData.append('applied_time_hours', data.applied_time_hours || 0)
formData.append('applied_time_minutes', data.applied_time_minutes || 0)
formData.append('reason', data.reason)
formData.append('attachment', file) // File object
```

### 5. API Service Layer (`api.js`)

**Responsibilities:**
- HTTP request handling
- JWT authentication
- Token refresh on 401
- Error handling
- FormData for file uploads

**Key Methods:**

```javascript
// List with filters
async getOvertimeApplications(params = {}) {
  // params: page, limit, status, application_date_from, application_date_to, search, employee, department, position
  // Returns: { success, data, totalRecords, currentPage, totalPages, limit }
}

// Create
async createOvertimeApplication(data) {
  // data: employee, application_date, applied_time_hours, applied_time_minutes, reason, attachment (File)
  // Returns: { success, data } or { success: false, message, details }
}

// Update (pending only)
async updateOvertimeApplication(id, data) {
  // Same fields as create
  // Returns: { success, data } or { success: false, message }
}

// Delete (soft delete)
async deleteOvertimeApplication(id) {
  // Returns: { success, message }
}

// Get single record
async getOvertimeById(id) {
  // Returns: { success, data }
}

// Workflow actions
async reviewOvertimeApplication(id, remarks) { ... }
async approveOvertimeApplication(id, { approved_time_hours, approved_time_minutes, approved_remarks }) { ... }
async disapproveOvertimeApplication(id, remarks) { ... }
async cancelOvertimeApplication(id, remarks) { ... }

// Attachment
async getOvertimeAttachment(id) { ... }              // Get file (blob)
async getOvertimeAttachmentInfo(id) { ... }         // Get metadata
async replaceOvertimeAttachment(id, file) { ... }   // Upload/Replace

// Export
async exportOvertimeToCSV(params = {}) {
  // Same filter params as list
  // Downloads CSV file via PyQt dialog or browser download
  // Returns: { success, message }
}
```

## Record Data Structure

### API Response Format
```javascript
{
  id: 1,
  employee: "Juan Dela Cruz",              // Formatted name
  employee_id: 2001,                       // Employee system ID
  application_date: "2025-11-05",          // YYYY-MM-DD
  requested_date: "2025-11-05",            // YYYY-MM-DD
  applied_time_hours: 2,
  applied_time_minutes: 30,
  applied_display: "2h 30m",               // Formatted display
  approved_time_hours: 2,
  approved_time_minutes: 0,
  approved_display: "2h 0m",               // Formatted display
  reason: "System maintenance",
  status: "approved",                      // pending, approved, disapproved, cancelled
  status_display: "Approved",              // Display text
  is_editable: false,                      // Only pending = true
  has_attachment: true,

  // Timeline info
  reviewed_by: "Admin User",
  reviewed_date: "2025-11-05",
  approved_by: "Manager User",
  approved_date: "2025-11-05",
  disapproved_by: null,
  disapproved_date: null,
  cancelled_by: null,
  cancelled_date: null,

  // Remarks
  reviewed_remarks: "Checked",
  approved_remarks: "Approved for 2 hours",
  disapproved_remarks: null,
  cancelled_remarks: null
}
```

## Permissions System

### Permission Keys
```javascript
{
  resource: 'overtime_application',
  actions: ['create', 'read', 'edit', 'delete']
}
```

### Permission Checks
```javascript
// Load from localStorage (set during getUserInfo)
const userData = JSON.parse(localStorage.getItem('user_data'))
const permissions = userData?.permissions || {}

// Check permission
const hasPermission = (resource, action) => {
  return permissions[resource]?.[action] || false
}

// Computed permissions
const canCreate = computed(() => hasPermission('overtime_application', 'create'))
const canUpdate = computed(() => hasPermission('overtime_application', 'edit'))
const canDelete = computed(() => hasPermission('overtime_application', 'delete'))
const canRead = computed(() => hasPermission('overtime_application', 'read'))
```

### Employee vs Admin Behavior
```javascript
const userData = JSON.parse(localStorage.getItem('user_data'))
const isEmployee = computed(() => !!userData?.employee?.id)

// Employee-specific behavior:
// - Employee dropdown is hidden (pre-filled with own employee_id)
// - Can only see their own applications (backend filters by employee)

// Admin-specific behavior:
// - Employee dropdown is visible (can create for any employee)
// - Can see all applications
// - Can approve/disapprove applications
```

## Filter & Pagination

### Filter State
```javascript
const filters = reactive({
  status: 'all',                    // all, pending, approved, disapproved, cancelled
  application_date_from: '',        // YYYY-MM-DD
  application_date_to: '',          // YYYY-MM-DD
  search: ''                        // Search employee name
})
```

### Pagination State
```javascript
const currentPage = ref(1)
const totalRecords = ref(0)
const totalPages = ref(1)
const limit = 10  // Records per page

// Computed
const startRecord = computed(() => (currentPage.value - 1) * limit + 1)
const endRecord = computed(() => Math.min(currentPage.value * limit, totalRecords.value))
```

### Filter Application
```javascript
const applyFilters = async () => {
  currentPage.value = 1  // Reset to page 1
  await fetchOvertimeApplications()
}

const fetchOvertimeApplications = async () => {
  const params = {
    page: currentPage.value,
    limit: 10,
    ...filters  // Spread filter values
  }
  const result = await apiService.getOvertimeApplications(params)
  // Update state...
}
```

## Export to CSV

### Export Flow
```javascript
// 1. User clicks Export button
const handleExport = async () => {
  const result = await exportToCSV()
  if (result.success) {
    console.log(result.message)
  }
}

// 2. API service gets pre-signed URL from backend
const response = await fetch('/api/applications/overtime/export/', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const presignedUrl = await response.text()

// 3. Fetch CSV content from pre-signed URL
const csvResponse = await fetch(presignedUrl)
const csvContent = await csvResponse.text()

// 4. Desktop app: Use PyQt file dialog
if (window.kioskBridge?.saveFileDialog) {
  const result = await window.kioskBridge.saveFileDialog(csvContent, filename)
}

// 5. Web app: Trigger browser download
else {
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
```

## File Attachment Handling

### Upload (Create/Edit)
```javascript
// FormData format
const formData = new FormData()
formData.append('attachment', file)  // File from <input type="file">

// Validation
- File type: Must be image/* (JPG, PNG, GIF, WebP)
- File size: Max 10MB
- Optional: Not required
```

### View Attachment
```javascript
// Step 1: Get attachment metadata
const infoResult = await apiService.getOvertimeAttachmentInfo(id)
// Returns: { has_attachment, original_filename, attachment_size_mb }

// Step 2: Get attachment file (if has_attachment = true)
const attachmentResult = await apiService.getOvertimeAttachment(id)
// Returns: { success, blob, contentType, filename }

// Step 3: Display image
const imageUrl = URL.createObjectURL(blob)
// Use in <img :src="imageUrl">

// Step 4: Clean up when done
URL.revokeObjectURL(imageUrl)
```

### Replace Attachment
```javascript
const result = await apiService.replaceOvertimeAttachment(id, newFile)
// Replaces existing attachment or uploads new one
```

### Known Issue
**Attachment viewing in Desktop app**: The `/attachment/` endpoint returns a 302 redirect to MinIO, which doesn't work properly in QWebEngineView due to security restrictions. This feature is temporarily disabled (View Attachment button removed). Possible solutions:
1. Use PyQt bridge to fetch file directly in Python
2. Backend returns pre-signed URL in JSON instead of redirect
3. Backend proxies the file content instead of redirecting

## Styling & UI

### Color Scheme
- Primary: Blue (`bg-blue-500`, `text-blue-600`)
- Success: Green (`bg-green-500`, `text-green-600`)
- Warning: Amber (`bg-amber-500`, `text-amber-600`)
- Danger: Red (`bg-red-500`, `text-red-600`)
- Neutral: Slate (`bg-slate-100`, `text-slate-700`)

### Component Styling
- Rounded corners: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px)
- Shadows: `shadow-sm`, `shadow-xl`, `shadow-2xl`
- Backdrop blur: `bg-white/70 backdrop-blur`
- Ring borders: `ring-1 ring-black/5`

### Responsive Design
- Mobile-first approach
- Flexbox layouts: `flex flex-col md:flex-row`
- Grid layouts: `grid grid-cols-2 gap-4`
- Full-width on mobile, constrained on desktop

## Reusable Patterns for Other Modules

### To Create a New Module (e.g., Leave):

1. **Create Components:**
   ```
   components/LeaveView.vue
   components/leave/LeaveTable.vue
   components/leave/LeaveFormDialog.vue
   ```

2. **Create Composable:**
   ```
   composables/useLeaveManagement.js
   ```

3. **Add API Methods in `api.js`:**
   ```javascript
   async getLeaveApplications(params) { ... }
   async createLeaveApplication(data) { ... }
   async updateLeaveApplication(id, data) { ... }
   // etc.
   ```

4. **Update Permissions:**
   ```javascript
   resource: 'leave_application'
   actions: ['create', 'read', 'edit', 'delete']
   ```

5. **Follow Same Pattern:**
   - Main view with filters and table
   - Composable for state management
   - Table component for display
   - Form dialog for create/edit
   - Export functionality
   - Attachment support (optional)

### Key Differences by Module Type:

**Leave Module:**
- Additional fields: leave_type, leave_date_from, leave_date_to, number_of_days
- Different status workflow
- May have different approval levels

**Holiday Module:**
- Admin-only creation
- No employee field
- Different fields: holiday_name, holiday_date, holiday_type

**Official Business Module:**
- Similar to overtime
- Fields: business_date, purpose, location

**Restday Module:**
- Similar to overtime
- Fields: restday_date, reason

**Undertime Module:**
- Similar to overtime
- Fields: undertime_date, undertime_hours, undertime_minutes, reason

## Testing Checklist

- [ ] List view loads with correct data
- [ ] Filters work correctly (status, date range, search)
- [ ] Pagination works (next, previous, page numbers)
- [ ] Create new application (with and without attachment)
- [ ] Edit pending application
- [ ] Cannot edit non-pending application
- [ ] Delete application (soft delete)
- [ ] Approve application (admin only)
- [ ] Disapprove application (admin only)
- [ ] Cancel application
- [ ] Export to CSV works in desktop app
- [ ] Employee can only see their own records
- [ ] Admin can see all records
- [ ] Permissions are respected (create, read, edit, delete)
- [ ] Form validation works
- [ ] File upload validation (type, size)
- [ ] Attachment metadata loads correctly
- [ ] Token refresh on 401 works
- [ ] Error messages display properly
- [ ] Loading states show correctly
- [ ] Empty states display when no data
- [ ] Mobile responsive design works

## Notes

- **Desktop App**: Uses PyQt6 QWebEngineView with `window.kioskBridge` for Python-JavaScript communication
- **Web App**: Standard Vue 3 app with Vite dev server
- **Authentication**: JWT tokens stored in localStorage with automatic refresh
- **Backend**: Django REST Framework with MinIO for file storage
- **Database**: PostgreSQL with soft-delete pattern (deleted_at timestamp)
