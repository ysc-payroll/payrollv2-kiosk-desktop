# Centralized Error Handling Guide

## Overview

The application now has a centralized error handling system that manages all HTTP errors, status codes, and user notifications consistently across all modules.

## Architecture

```
┌─────────────────┐
│   HTTP Client   │ ← Catches network/HTTP errors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Error Handler  │ ← Parses, categorizes, logs
└────────┬────────┘
         │
         ├──► Console logging (with emoji categorization)
         ├──► Error log storage (last 100 errors)
         └──► Toast notifications (user-facing)
```

## Files

### Core Error Handler
- **`src/services/errorHandler.js`** - Centralized error handling service

### Integration Points
- **`src/services/http-client.js`** - HTTP client logs all errors
- **`src/composables/useApplicationManagement.js`** - Composable uses error handler for all operations
- **`src/components/shared/GenericApplicationView.vue`** - View displays errors automatically

### Toast System
- **`src/composables/useToast.js`** - Toast state management
- **`src/components/shared/ToastContainer.vue`** - Toast display component

## HTTP Status Code Handling

### 4xx Client Errors
| Code | Message | Severity |
|------|---------|----------|
| 400 | Bad Request - Invalid data submitted | Medium |
| 401 | Unauthorized - Please login again | Critical |
| 403 | Forbidden - You don't have permission | Critical |
| 404 | Not Found - Resource not found | High |
| 409 | Conflict - Resource already exists | High |
| 422 | Validation Error - Check your input | High |
| 429 | Too Many Requests - Please slow down | Medium |

### 5xx Server Errors
| Code | Message | Severity |
|------|---------|----------|
| 500 | Internal Server Error | Critical |
| 502 | Bad Gateway - Server unavailable | Critical |
| 503 | Service Unavailable - Under maintenance | Critical |
| 504 | Gateway Timeout | Critical |

### Network Errors
| Code | Message | Severity |
|------|---------|----------|
| 0 | Network Error - Check internet connection | Low |

## Error Categories

1. **Network** - Connection issues, timeouts
2. **Client** - 4xx errors, validation, permissions
3. **Server** - 5xx errors, backend failures
4. **Unknown** - Unexpected errors

## Usage

### Automatic Error Handling (Recommended)

All CRUD operations in `useApplicationManagement` automatically handle errors:

```javascript
// In your view/component
const { createApplication } = useOvertimeManagement()

// This automatically shows toast on error
const result = await createApplication(data)
```

### Manual Error Handling

```javascript
import errorHandler from '@/services/errorHandler.js'

try {
  // Your operation
  const result = await someApiCall()
} catch (error) {
  // Handle with toast notification
  errorHandler.handle(error, {
    context: 'Create Overtime',
    operation: 'create',
    showToast: true
  })
}
```

### Success Messages

```javascript
import errorHandler from '@/services/errorHandler.js'

// Show success with toast
errorHandler.handleSuccess('Overtime created successfully', {
  showToast: true,
  data: responseData
})
```

### Wrap Async Functions

```javascript
import errorHandler from '@/services/errorHandler.js'

const result = await errorHandler.wrap(
  async () => {
    return await riskyOperation()
  },
  {
    context: 'Risky Operation',
    operation: 'custom',
    showToast: true
  }
)
```

## Error Logging

### View Error Log

All errors are logged with detailed information:

```javascript
import errorHandler from '@/services/errorHandler.js'

// Get all errors
const allErrors = errorHandler.getErrorLog()

// Filter by category
const networkErrors = errorHandler.getErrorLog({ category: 'network' })

// Filter by severity
const criticalErrors = errorHandler.getErrorLog({ severity: 'critical' })

// Filter by time
const recentErrors = errorHandler.getErrorLog({
  since: new Date(Date.now() - 3600000) // Last hour
})
```

### Error Statistics

```javascript
import errorHandler from '@/services/errorHandler.js'

const stats = errorHandler.getErrorStats()
console.log(stats)
// {
//   total: 42,
//   byCategory: { network: 10, client: 20, server: 12 },
//   bySeverity: { critical: 5, high: 15, medium: 20, low: 2 },
//   byStatus: { 400: 10, 404: 5, 500: 3, 0: 10 }
// }
```

### Console Logging

Errors are logged to console with emoji categorization:

```
🔴 [SERVER] Create overtime: { status: 500, message: "Internal Server Error", ... }
🟠 [CLIENT] Fetch overtime details: { status: 404, message: "Not Found", ... }
🟡 [CLIENT] Update overtime: { status: 400, message: "Bad Request", ... }
🔵 [NETWORK] Export overtime: { status: 0, message: "Network Error", ... }
```

## Toast Notifications

### Automatic Display

Toast notifications are automatically shown for:

- ✅ **Success** (Green): Create, Update, Delete, Cancel operations
- ❌ **Error** (Red): All failed operations
- ⚠️ **Warning** (Amber): Custom warnings
- ℹ️ **Info** (Blue): Custom info messages

### Duration

- **Critical errors**: 5 seconds
- **High severity**: 4 seconds
- **Medium/Low**: 3 seconds

### Features

- Auto-dismiss after duration
- Manual close with X button
- Multiple toasts stack vertically
- Slide-in animation from right
- Color-coded by type

## Error Message Formatting

### Priority Order

1. **Server field errors**: Django REST Framework validation errors
   ```json
   { "employee": ["This field is required"], "date": ["Invalid date format"] }
   ```
   Displayed as: `employee: This field is required\ndate: Invalid date format`

2. **Server detail message**: `{ "detail": "Permission denied" }`
   Displayed as: `Permission denied`

3. **Custom message**: From catch block or service
   Displayed as provided

4. **Status-based message**: Generic HTTP status message
   Displayed as: `Error 404 - Not Found`

### Context Addition

If context is provided, it's prepended:
```javascript
errorHandler.handle(error, { context: 'Create Overtime' })
// Result: "Create Overtime: Bad Request - Invalid data submitted"
```

## Best Practices

### 1. Let the Error Handler Do Its Job

❌ **Don't:**
```javascript
try {
  await createApplication(data)
} catch (error) {
  console.error(error) // Error handler already logs
  toast.error(error.message) // Error handler already shows toast
}
```

✅ **Do:**
```javascript
const result = await createApplication(data)
if (result.success) {
  // Handle success UI changes only
  closeModal()
}
// Error handler takes care of everything else
```

### 2. Use Consistent Context Names

```javascript
// Operation types
context: 'Create overtime'
context: 'Update overtime'
context: 'Delete overtime'
context: 'Fetch overtime details'
context: 'Export overtime'
```

### 3. Control Toast Display

```javascript
// Show toast for user actions
errorHandler.handle(error, {
  context: 'Create overtime',
  showToast: true
})

// Don't show toast for background operations
errorHandler.handle(error, {
  context: 'Fetch applications',
  showToast: false
})
```

### 4. Check Error Log for Patterns

Regularly check error statistics to identify recurring issues:

```javascript
const stats = errorHandler.getErrorStats()
if (stats.byStatus[401] > 10) {
  console.warn('Too many auth errors - token refresh issue?')
}
```

## Integration with Services

All application services automatically use error handler:

- `overtime.service.js`
- `holiday.service.js`
- `restday.service.js`
- `undertime.service.js`
- `leave.service.js`

No changes needed to service code - error handling is transparent.

## Future Enhancements

Potential improvements:

1. **Error Reporting**: Send critical errors to backend logging service
2. **Retry Logic**: Automatic retry for network errors
3. **Offline Detection**: Better handling of offline scenarios
4. **Error Recovery**: Suggested actions for common errors
5. **Analytics**: Track error patterns for UX improvements

## Debugging

### View Last 10 Errors

```javascript
console.table(errorHandler.getErrorLog().slice(0, 10))
```

### Clear Error Log

```javascript
errorHandler.clearErrorLog()
```

### Test Error Handler

```javascript
// Test with fake error
errorHandler.handle(
  { status: 404, message: 'Test error', data: null },
  { context: 'Test', showToast: true }
)

// Test success
errorHandler.handleSuccess('Test success!', { showToast: true })
```

## Summary

The centralized error handler provides:

✅ **Consistency** - All errors handled the same way
✅ **Visibility** - Users see clear, actionable messages
✅ **Debugging** - Complete error log for troubleshooting
✅ **Simplicity** - No error handling code in views/components
✅ **Flexibility** - Easy to customize per use case
✅ **Scalability** - Single place to enhance error handling

All application modules (Overtime, Leave, Holiday, Restday, Undertime) now use this centralized system.
