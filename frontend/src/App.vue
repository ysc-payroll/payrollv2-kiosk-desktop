<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import CameraView from './components/CameraView.vue'
import NumericKeypad from './components/NumericKeypad.vue'
import ToastNotification from './components/ToastNotification.vue'
import ToastContainer from './components/shared/ToastContainer.vue'
import LoginView from './components/LoginView.vue'
import EmployeeList from './components/EmployeeList.vue'
import OvertimeView from './components/OvertimeView.vue'
import LeaveView from './components/LeaveView.vue'
import HolidayView from './components/HolidayView.vue'
import RestdayView from './components/RestdayView.vue'
import UndertimeView from './components/UndertimeView.vue'
import OfficialBusinessView from './components/OfficialBusinessView.vue'
import TimelogsView from './components/TimelogsView.vue'
import apiService from './services/api.js'

// Component refs
const cameraRef = ref(null)
const inputRef = ref(null)

// State
const employeeId = ref('')
const cameraReady = ref(false)
const cameraEnabled = ref(true) // Camera toggle state
const isProcessing = ref(false)

// Face recognition mode
const useFaceRecognition = ref(false)
const isFaceScanning = ref(false)
const faceRecognitionInterval = ref(null)

// Employee validation state
const employeeValidation = ref({
  status: 'default', // 'default' | 'not_found' | 'found' | 'recognizing'
  employeeName: '',
  isValid: false
})

// Toast state
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref('info')

// Timesheet logs state
const recentLogs = ref([])

// Timesheet sync state
const isSyncingTimesheets = ref(false)
const unsyncedTimesheetsCount = ref(0)
let timesheetSyncInterval = null

// Date range filter state
const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0] // YYYY-MM-DD format
}

const dateFrom = ref(getTodayDate())
const dateTo = ref(getTodayDate())

// Sidebar state
const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// Camera toggle
const toggleCamera = () => {
  cameraEnabled.value = !cameraEnabled.value
  if (!cameraEnabled.value) {
    cameraReady.value = false
  }
}

const handleCameraToggleHover = (event, isHover) => {
  if (cameraEnabled.value) {
    event.currentTarget.style.backgroundColor = isHover ? '#17A048' : '#1CB454'
  } else {
    event.currentTarget.style.backgroundColor = isHover ? '#554F4B' : '#68625D'
  }
}

// Face Recognition Mode Toggle
const toggleFaceRecognition = () => {
  useFaceRecognition.value = !useFaceRecognition.value

  if (useFaceRecognition.value) {
    // Switching to face recognition mode
    employeeId.value = ''
    employeeValidation.value = {
      status: 'default',
      employeeName: '',
      isValid: false
    }

    // Enable camera if disabled
    if (!cameraEnabled.value) {
      cameraEnabled.value = true
    }

    // Start face scanning
    startFaceScanning()
  } else {
    // Switching to employee number mode
    stopFaceScanning()
    employeeValidation.value = {
      status: 'default',
      employeeName: '',
      isValid: false
    }
    focusInput()
  }
}

// Face Recognition Scanning
const startFaceScanning = () => {
  if (!cameraEnabled.value || !cameraReady.value) {
    return
  }

  isFaceScanning.value = true
  employeeValidation.value = {
    status: 'recognizing',
    employeeName: '',
    isValid: false
  }

  // Scan every 2 seconds
  faceRecognitionInterval.value = setInterval(async () => {
    await performFaceRecognition()
  }, 2000)
}

const stopFaceScanning = () => {
  if (faceRecognitionInterval.value) {
    clearInterval(faceRecognitionInterval.value)
    faceRecognitionInterval.value = null
  }
  isFaceScanning.value = false
}

const performFaceRecognition = async () => {
  if (!cameraRef.value || !kioskBridge) return

  try {
    // Capture photo from camera
    const photoBase64 = await cameraRef.value.capturePhoto()

    if (!photoBase64) {
      console.log('No photo captured')
      return
    }

    // Call bridge to recognize face
    const resultJson = await kioskBridge.recognizeFace(photoBase64)
    const result = JSON.parse(resultJson)

    if (result.success && result.employee) {
      // Face recognized!
      stopFaceScanning()

      employeeValidation.value = {
        status: 'found',
        employeeName: result.employee.name,
        isValid: true
      }

      // Store employee number for time logging
      employeeId.value = result.employee.employee_number.toString()

      // Show confidence in toast
      showToast(`Face recognized: ${result.employee.name} (${result.employee.confidence}% confidence)`, 'success')
    } else {
      // No match found, keep scanning
      employeeValidation.value = {
        status: 'recognizing',
        employeeName: result.message || 'Scanning for face...',
        isValid: false
      }
    }
  } catch (error) {
    console.error('Face recognition error:', error)
    employeeValidation.value = {
      status: 'recognizing',
      employeeName: 'Scanning for face...',
      isValid: false
    }
  }
}

// PyQt Bridge
let kioskBridge = null
let pendingSyncAfterLogin = false

onMounted(async () => {
  // Check authentication status first
  await checkAuthentication()

  // Initialize QWebChannel bridge for PyQt communication
  if (window.qt && window.qt.webChannelTransport) {
    new window.QWebChannel(window.qt.webChannelTransport, (channel) => {
      kioskBridge = channel.objects.kioskBridge
      window.kioskBridge = kioskBridge // Expose globally for API service
      console.log('PyQt bridge connected')

      // Only load data if authenticated
      if (isAuthenticated.value) {
        loadCompanyInfo()
        loadRecentLogs()

        // Sync employees if we're authenticated (e.g., from stored session)
        console.log('🔄 Bridge ready, syncing employees...')
        syncEmployeesFromAPI()
      }

      // If there's a pending sync from login, execute it now
      if (pendingSyncAfterLogin) {
        console.log('🔄 Bridge ready, executing pending sync from login...')
        pendingSyncAfterLogin = false
        syncEmployeesFromAPI()
      }
    })
  } else {
    console.warn('PyQt bridge not available - running in browser mode')
  }

  // Auto-focus input field on mount (only if authenticated)
  if (isAuthenticated.value) {
    focusInput()
  }

  // Add click outside handler for user dropdown
  document.addEventListener('click', handleClickOutside)
})

// Focus the input field
const focusInput = () => {
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }, 100)
}

// Employee validation
let validationTimeout = null

const validateEmployee = async () => {
  const empId = employeeId.value.trim()

  // Reset validation if empty
  if (!empId) {
    employeeValidation.value = {
      status: 'default',
      employeeName: '',
      isValid: false
    }
    return
  }

  // Check if numeric
  const empNumber = parseInt(empId, 10)
  if (isNaN(empNumber)) {
    return // Don't validate non-numeric input
  }

  // Perform validation
  try {
    if (kioskBridge && kioskBridge.getEmployeeByNumber) {
      const resultJson = await kioskBridge.getEmployeeByNumber(empNumber)
      const result = JSON.parse(resultJson)

      console.log('🔍 Employee validation result:', result)
      console.log('🔍 Employee data:', result.employee)
      console.log('🔍 Employee name:', result.employee?.name)

      if (result.success && result.employee) {
        // Employee found
        employeeValidation.value = {
          status: 'found',
          employeeName: result.employee.name || 'Unknown',
          isValid: true
        }
        console.log('✅ Set employeeValidation:', employeeValidation.value)
      } else {
        // Employee not found
        employeeValidation.value = {
          status: 'not_found',
          employeeName: '',
          isValid: false
        }
      }
    }
  } catch (error) {
    console.error('Validation error:', error)
    employeeValidation.value = {
      status: 'not_found',
      employeeName: '',
      isValid: false
    }
  }
}

// Watch employeeId for real-time validation with debounce
watch(employeeId, () => {
  // Clear previous timeout
  if (validationTimeout) {
    clearTimeout(validationTimeout)
  }

  // Debounce validation by 300ms
  validationTimeout = setTimeout(() => {
    validateEmployee()
  }, 300)
})

// Keypad handlers
const handleDigitClick = (digit) => {
  if (employeeId.value.length < 10) {
    employeeId.value += digit
  }
}

const handleBackspace = () => {
  employeeId.value = employeeId.value.slice(0, -1)
}

const handleClear = () => {
  employeeId.value = ''
}

// Keyboard input handler - allow only numeric characters
const handleKeyboardInput = (event) => {
  // Filter out non-numeric characters
  employeeId.value = employeeId.value.replace(/[^0-9]/g, '')
}

// Camera handlers
const handleCameraReady = () => {
  cameraReady.value = true
}

const handleCameraError = (error) => {
  showToast(`Camera Error: ${error}`, 'error')
}

// Toast helper
const showToast = (message, type = 'info') => {
  toastMessage.value = message
  toastType.value = type
  toastVisible.value = true
}

const handleToastClose = () => {
  toastVisible.value = false
}

// Time logging actions
const handleTimeEntry = async (action) => {
  // Validation
  if (!employeeId.value.trim()) {
    showToast('Please enter Employee ID', 'error')
    return
  }

  // Only require camera if enabled
  if (cameraEnabled.value && !cameraReady.value) {
    showToast('Camera not ready', 'error')
    return
  }

  if (isProcessing.value) {
    return // Prevent double-clicks
  }

  isProcessing.value = true

  try {
    // Capture photo (or null if camera disabled)
    let photoBase64 = null
    if (cameraEnabled.value && cameraRef.value) {
      photoBase64 = cameraRef.value.capturePhoto()
    }

    // Send to Python backend
    if (kioskBridge && kioskBridge.logTimeEntry) {
      const resultJson = await kioskBridge.logTimeEntry(
        employeeId.value,
        action,
        photoBase64 || '' // Send empty string if no photo
      )

      const result = JSON.parse(resultJson)

      if (result.success) {
        showToast(result.message, 'success')
        // Reset for next employee
        employeeId.value = ''
        focusInput()
        // Reload recent logs
        loadRecentLogs()
        // Update unsynced count (new timesheet entry added)
        updateUnsyncedCount()
      } else {
        showToast(result.message, 'error')
      }
    } else {
      // Browser mode - simulate success
      console.log('Browser mode - simulating success', {
        employeeId: employeeId.value,
        action,
        photoLength: photoBase64 ? photoBase64.length : 0,
        cameraEnabled: cameraEnabled.value
      })
      showToast(`Clocked ${action} (Browser Mode)`, 'success')
      employeeId.value = ''
      focusInput()
    }
  } catch (error) {
    console.error('Time entry error:', error)
    showToast(`Error: ${error.message}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

const handleClockIn = () => handleTimeEntry('IN')
const handleClockOut = () => handleTimeEntry('OUT')

const handleMoreOptions = () => {
  showToast('More Options - Coming in Phase 2', 'info')
}

// Load recent timesheet logs with date range
const loadRecentLogs = async () => {
  try {
    if (kioskBridge && kioskBridge.getLogsByDateRange) {
      const resultJson = await kioskBridge.getLogsByDateRange(dateFrom.value, dateTo.value)
      const result = JSON.parse(resultJson)

      if (result.success) {
        recentLogs.value = result.logs
        console.log('Loaded logs:', result.logs.length, 'from', dateFrom.value, 'to', dateTo.value)
      } else {
        console.error('Failed to load logs:', result.error)
      }
    }
  } catch (error) {
    console.error('Error loading recent logs:', error)
  }
}

// Watch date changes to reload logs
watch([dateFrom, dateTo], () => {
  loadRecentLogs()
})

// Feature button handlers - Navigation
const handleOvertimeClick = () => {
  currentView.value = 'overtime'
}

const handleLeaveClick = () => {
  currentView.value = 'leave'
}

const handleHolidayClick = () => {
  currentView.value = 'holiday'
}

const handleRestdayClick = () => {
  currentView.value = 'restday'
}

const handleUndertimeClick = () => {
  currentView.value = 'undertime'
}

const handleOfficialBusinessClick = () => {
  currentView.value = 'officialbusiness'
}

const handleTimelogsClick = () => {
  currentView.value = 'timelogs'
}

// Return to kiosk/home view
const handleHomeClick = () => {
  currentView.value = 'kiosk'
}

// Format timestamp for display
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  // Format time
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  // Show relative date
  if (diffDays === 0) {
    return `Today ${timeStr}`
  } else if (diffDays === 1) {
    return `Yesterday ${timeStr}`
  } else if (diffDays < 7) {
    return `${diffDays} days ago ${timeStr}`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + timeStr
  }
}

// Format date for table
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

// Format time for table
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// Hover handlers for IN/OUT buttons
const handleInButtonHover = (event, isHover) => {
  if (!isProcessing.value && employeeValidation.value.isValid) {
    event.currentTarget.style.backgroundColor = isHover ? '#17A048' : '#1CB454'
  }
}

const handleOutButtonHover = (event, isHover) => {
  if (!isProcessing.value && employeeValidation.value.isValid) {
    event.currentTarget.style.backgroundColor = isHover ? '#CC2E2E' : '#E63535'
  }
}

// Sidebar button hover handlers
const sidebarButtonColors = {
  overtime: { normal: '#3073F1', hover: '#2563D0' },
  leave: { normal: '#E2A907', hover: '#C89006' },
  holiday: { normal: '#E63535', hover: '#CC2E2E' },
  restday: { normal: '#0895D8', hover: '#0780BE' },
  undertime: { normal: '#E2A907', hover: '#C89006' },
  official: { normal: '#68625D', hover: '#554F4B' },
  timelogs: { normal: '#0895D8', hover: '#0780BE' }
}

const handleSidebarHover = (event, colorKey, isHover) => {
  const colors = sidebarButtonColors[colorKey]
  event.currentTarget.style.backgroundColor = isHover ? colors.hover : colors.normal
}

// Date input hover handlers
const handleDateInputFocus = (event, isFocus) => {
  event.currentTarget.style.borderColor = isFocus ? '#3073F1' : '#68625D'
}

// Table row hover handler
const handleTableRowHover = (event, index, isHover) => {
  const evenRowColor = index % 2 === 0 ? 'white' : '#EEF2F7'
  event.currentTarget.style.backgroundColor = isHover ? 'rgba(48, 115, 241, 0.1)' : evenRowColor
}

// Refresh button state
const isRefreshing = ref(false)

// Manual refresh handler
const handleRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  await loadRecentLogs()
  setTimeout(() => {
    isRefreshing.value = false
  }, 500) // Show spinning animation for at least 500ms
}

// ==================== TIMESHEET SYNC ====================

// Update unsynced timesheets count
const updateUnsyncedCount = async () => {
  try {
    const result = await apiService.getUnsyncedTimesheetsCount()
    if (result.success) {
      unsyncedTimesheetsCount.value = result.count || 0
      console.log(`📊 Unsynced timesheets: ${unsyncedTimesheetsCount.value}`)
    }
  } catch (error) {
    console.error('Error updating unsynced count:', error)
  }
}

// Manual timesheet sync handler
const handleTimesheetSync = async () => {
  if (isSyncingTimesheets.value) return

  console.log('🔄 Manual timesheet sync triggered...')
  isSyncingTimesheets.value = true

  try {
    const result = await apiService.syncTimesheetsToBackend()

    if (result.success) {
      if (result.synced_count > 0) {
        showToast(`Successfully synced ${result.synced_count} timesheet(s)`, 'success')
        console.log(`✅ Synced ${result.synced_count}/${result.total_count} timesheets`)

        if (result.failed_count > 0) {
          console.warn(`⚠️ Failed to sync ${result.failed_count} timesheets:`, result.errors)
          showToast(`Warning: ${result.failed_count} timesheet(s) failed to sync`, 'warning')
        }

        // Refresh logs and update count
        await loadRecentLogs()
        await updateUnsyncedCount()
      } else {
        showToast('No timesheets synced', 'info')
      }
    } else {
      showToast(result.message || 'Failed to sync timesheets', 'error')
      console.error('❌ Timesheet sync failed:', result.message)
    }

  } catch (error) {
    console.error('Error syncing timesheets:', error)
    showToast('Error syncing timesheets. Please try again.', 'error')
  } finally {
    isSyncingTimesheets.value = false
  }
}

// Sync individual timesheet
const handleSyncIndividualTimesheet = async (log) => {
  if (isSyncingTimesheets.value) return

  console.log('🔄 Syncing individual timesheet:', log)
  isSyncingTimesheets.value = true

  try {
    // Check if employee has backend_id
    if (!log.employee_backend_id) {
      showToast('Employee not synced to backend yet', 'error')
      return
    }

    // Extract date and time from timestamp (format: "2025-11-06 14:30")
    const [date, time] = log.timestamp.split(' ')

    // Sync this specific timesheet
    const syncResult = await apiService.createTimesheet(
      log.employee_backend_id,  // Use backend_id from log
      date,
      log.action.toLowerCase(), // Convert "IN"/"OUT" to "in"/"out"
      time
    )

    if (syncResult.success) {
      // Mark as synced in local database
      await window.kioskBridge.markTimesheetSynced(log.id, syncResult.timesheet_id)

      showToast('Timesheet synced successfully', 'success')
      console.log(`✅ Synced timesheet ID ${log.id} → Backend ID ${syncResult.timesheet_id}`)

      // Refresh logs and update count
      await loadRecentLogs()
      await updateUnsyncedCount()
    } else {
      // Mark sync as failed
      await window.kioskBridge.markTimesheetSyncFailed(log.id, syncResult.message || 'Unknown error')

      showToast(syncResult.message || 'Failed to sync timesheet', 'error')
      console.error('❌ Timesheet sync failed:', syncResult.message)

      // Refresh to show error status
      await loadRecentLogs()
    }

  } catch (error) {
    console.error('Error syncing individual timesheet:', error)
    showToast('Error syncing timesheet. Please try again.', 'error')

    // Mark sync as failed
    if (window.kioskBridge) {
      await window.kioskBridge.markTimesheetSyncFailed(log.id, error.message || 'Network error')
      await loadRecentLogs()
    }
  } finally {
    isSyncingTimesheets.value = false
  }
}

// Resync failed timesheet
const handleResyncTimesheet = async (log) => {
  if (isSyncingTimesheets.value) return

  console.log('🔄 Resyncing failed timesheet:', log)
  isSyncingTimesheets.value = true

  try {
    // Check if employee has backend_id
    if (!log.employee_backend_id) {
      showToast('Employee not synced to backend yet', 'error')
      return
    }

    // Extract date and time from timestamp (format: "2025-11-06 14:30")
    const [date, time] = log.timestamp.split(' ')

    // Retry sync - this will create a new timesheet on the backend
    const syncResult = await apiService.createTimesheet(
      log.employee_backend_id,  // Use backend_id from log
      date,
      log.action.toLowerCase(), // Convert "IN"/"OUT" to "in"/"out"
      time
    )

    if (syncResult.success) {
      // Mark as synced in local database (clears error message and sets backend_id)
      await window.kioskBridge.markTimesheetSynced(log.id, syncResult.timesheet_id)

      showToast('Timesheet resynced successfully', 'success')
      console.log(`✅ Resynced timesheet ID ${log.id} → Backend ID ${syncResult.timesheet_id}`)

      // Refresh logs and update count
      await loadRecentLogs()
      await updateUnsyncedCount()
    } else {
      // Update the error message
      await window.kioskBridge.markTimesheetSyncFailed(log.id, syncResult.message || 'Unknown error')

      showToast(syncResult.message || 'Failed to resync timesheet', 'error')
      console.error('❌ Timesheet resync failed:', syncResult.message)

      // Refresh to show updated error status
      await loadRecentLogs()
    }

  } catch (error) {
    console.error('Error resyncing timesheet:', error)
    showToast('Error resyncing timesheet. Please try again.', 'error')

    // Update error message
    if (window.kioskBridge) {
      await window.kioskBridge.markTimesheetSyncFailed(log.id, error.message || 'Network error')
      await loadRecentLogs()
    }
  } finally {
    isSyncingTimesheets.value = false
  }
}

// Periodic timesheet sync (every 10 minutes)
const startPeriodicTimesheetSync = () => {
  // Clear existing interval if any
  if (timesheetSyncInterval) {
    clearInterval(timesheetSyncInterval)
  }

  // Initial count update
  updateUnsyncedCount()

  // Sync every 10 minutes (600000 ms)
  timesheetSyncInterval = setInterval(async () => {
    console.log('⏰ Periodic timesheet sync triggered (10 min interval)...')

    // Only sync if there are unsynced timesheets
    if (unsyncedTimesheetsCount.value > 0 && !isSyncingTimesheets.value) {
      isSyncingTimesheets.value = true

      try {
        const result = await apiService.syncTimesheetsToBackend()

        if (result.success && result.synced_count > 0) {
          console.log(`✅ Periodic sync: ${result.synced_count}/${result.total_count} timesheets synced`)

          // Refresh logs and update count
          await loadRecentLogs()
          await updateUnsyncedCount()
        }
      } catch (error) {
        console.error('Error in periodic sync:', error)
      } finally {
        isSyncingTimesheets.value = false
      }
    } else {
      // Just update the count
      await updateUnsyncedCount()
    }
  }, 600000) // 10 minutes

  console.log('⏰ Periodic timesheet sync started (every 10 minutes)')
}

// Stop periodic sync
const stopPeriodicTimesheetSync = () => {
  if (timesheetSyncInterval) {
    clearInterval(timesheetSyncInterval)
    timesheetSyncInterval = null
    console.log('⏰ Periodic timesheet sync stopped')
  }
}

// User dropdown state
const userDropdownOpen = ref(false)
const currentUserName = ref('Admin User') // Placeholder - will be replaced with actual user data

// Company information
const companyName = ref('Timekeeper Kiosk') // Default fallback
const companyData = ref(null) // Complete company data from API

// Application version
const appVersion = ref('v2.0.0')

// Authentication state
const isAuthenticated = ref(false)
const currentUser = ref(null)
const currentUserPermissions = ref(null)
const isCheckingAuth = ref(true) // Loading state for initial auth check

// View states - SPA navigation
const currentView = ref('kiosk') // 'kiosk' | 'employee' | 'overtime' | 'leave' | 'holiday' | 'restday' | 'undertime' | 'officialbusiness' | 'timelogs'

const toggleUserDropdown = () => {
  userDropdownOpen.value = !userDropdownOpen.value
}

const handleEmployeeList = () => {
  currentView.value = 'employee'
  userDropdownOpen.value = false
}

const handleSettings = () => {
  userDropdownOpen.value = false
  showToast('Settings - Coming soon', 'info')
}

const handleLogout = async () => {
  userDropdownOpen.value = false

  // Call API logout
  await apiService.logout()

  // Stop periodic timesheet sync
  stopPeriodicTimesheetSync()

  isAuthenticated.value = false
  currentUser.value = null
  currentUserName.value = 'Admin User'
  showToast('Logged out successfully', 'success')
}

// Handle successful login
const handleLoginSuccess = async (data) => {
  console.log('🔵 handleLoginSuccess called with data:', data)
  console.log('🔵 data.company value:', data.company)
  console.log('🔵 Type of data.company:', typeof data.company)
  console.log('🔵 Full data object keys:', Object.keys(data))

  isAuthenticated.value = true
  currentUser.value = data.user
  currentUserName.value = data.user.name
  currentUserPermissions.value = data.permissions

  // Store company data from API
  if (data.company) {
    console.log('✅ Company data received:', data.company)
    companyData.value = data.company
    companyName.value = data.company.name
    console.log('✅ Company name set to:', companyName.value)

    // Update company in database via bridge (don't block on this)
    if (kioskBridge) {
      updateCompanyInDatabase(data.company).catch(err => {
        console.error('Failed to update company in database:', err)
      })
    }
  } else {
    console.warn('⚠️ No company data in login response!')
    console.warn('⚠️ Available keys in data:', Object.keys(data))
  }

  // Update user in database via bridge (don't block on this)
  if (data.user && kioskBridge) {
    updateUserInDatabase(data.user).catch(err => {
      console.error('Failed to update user in database:', err)
    })
  }

  showToast(`Welcome back, ${data.user.name}!`, 'success')

  // Load recent logs after login
  loadRecentLogs()

  // Sync employees from API to local database
  console.log('📥 About to sync employees after login')
  console.log('📥 kioskBridge:', kioskBridge)
  console.log('📥 window.kioskBridge:', window.kioskBridge)
  console.log('📥 Bridge available:', !!(kioskBridge || window.kioskBridge))

  // If bridge is ready, sync immediately
  if (kioskBridge || window.kioskBridge) {
    console.log('✅ Bridge available, syncing immediately...')
    await syncEmployeesFromAPI()
  } else {
    // Mark that we need to sync once bridge is ready
    console.log('⏳ Bridge not ready yet, will sync when bridge initializes...')
    pendingSyncAfterLogin = true
  }

  // Start periodic timesheet sync after login
  startPeriodicTimesheetSync()
}

// Update company in database via bridge
const updateCompanyInDatabase = async (company) => {
  if (!kioskBridge) return

  try {
    const result = await kioskBridge.updateCompany(JSON.stringify(company))
    const data = JSON.parse(result)
    if (data.success) {
      console.log('Company data synced to database')
    }
  } catch (error) {
    console.error('Error updating company in database:', error)
  }
}

// Update user in database via bridge
const updateUserInDatabase = async (user) => {
  if (!kioskBridge) return

  try {
    const result = await kioskBridge.updateCurrentUser(user.email, user.name)
    const data = JSON.parse(result)
    if (data.success) {
      console.log('User data synced to database')
    }
  } catch (error) {
    console.error('Error updating user in database:', error)
  }
}

// Check authentication on startup
const checkAuthentication = async () => {
  isCheckingAuth.value = true

  // Load tokens from localStorage
  apiService.loadTokens()

  // Check if tokens exist and are valid
  if (apiService.isAuthenticated()) {
    const isValid = await apiService.verifyToken()

    if (isValid) {
      // Token is valid, restore session
      const userData = apiService.getUserData()
      const storedCompanyData = apiService.getCompanyData()

      if (userData) {
        isAuthenticated.value = true
        currentUser.value = {
          id: userData.id || userData.pk,
          email: userData.email,
          name: `${userData.first_name} ${userData.last_name}`,
          firstName: userData.first_name,
          lastName: userData.last_name
        }
        currentUserName.value = currentUser.value.name

        // Restore company data
        if (storedCompanyData) {
          companyData.value = storedCompanyData
          companyName.value = storedCompanyData.name
        }

        // Restore permissions if available
        if (userData.permissions) {
          currentUserPermissions.value = userData.permissions
        }

        console.log('Session restored from stored tokens')
      }
    } else {
      // Token invalid, try to refresh
      const refreshed = await apiService.refreshAccessToken()
      if (refreshed) {
        await checkAuthentication() // Retry with new token
        return
      } else {
        // Refresh failed, clear tokens
        apiService.clearTokens()
      }
    }
  }

  isCheckingAuth.value = false
}

// Sync employees from API to local database (with cleanup)
const syncEmployeesFromAPI = async () => {
  console.log('🔄 syncEmployeesFromAPI called')
  console.log('🔄 kioskBridge available:', !!kioskBridge)
  console.log('🔄 window.kioskBridge available:', !!window.kioskBridge)

  const bridge = kioskBridge || window.kioskBridge

  if (!bridge) {
    console.warn('⚠️ Bridge not available, skipping employee sync')
    return
  }

  try {
    console.log('📡 Fetching and syncing employees from API...')

    // Use the syncEmployeesWithCleanup API method
    // This fetches from API and syncs with cleanup in one call
    const result = await apiService.syncEmployeesWithCleanup()
    console.log('💾 Sync result:', result)

    if (result.success) {
      const syncData = result.data
      const totalSynced = (syncData.added_count || 0) + (syncData.updated_count || 0)
      console.log(`✅ Successfully synced ${totalSynced} employees (${syncData.added_count} added, ${syncData.updated_count} updated)`)
      if (syncData.deleted_count > 0) {
        console.log(`🗑️ Soft-deleted ${syncData.deleted_count} employees`)
      }
      if (syncData.skipped_count > 0) {
        console.log(`⏭️ Skipped ${syncData.skipped_count} employees (have application records)`)
      }
      // Reload recent logs after sync
      loadRecentLogs()
    } else {
      console.error('❌ Employee sync failed:', result.message)
    }
  } catch (error) {
    console.error('❌ Error syncing employees:', error)
  }
}

// Load company information (fallback - now using API data)
const loadCompanyInfo = async () => {
  // Company info now comes from /api/auth/user/ endpoint
  // This function is kept as fallback for local database
  if (!kioskBridge) {
    console.warn('Bridge not available, using default company name')
    return
  }

  // Only load from local DB if we don't have company data from API
  if (companyData.value && companyData.value.name) {
    companyName.value = companyData.value.name
    return
  }

  try {
    const result = await kioskBridge.getCurrentCompany()
    const data = JSON.parse(result)

    if (data.success && data.company && data.company.name) {
      companyName.value = data.company.name
    }
  } catch (error) {
    console.error('Error loading company info:', error)
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (userDropdownOpen.value) {
    const dropdown = event.target.closest('.relative')
    if (!dropdown || !dropdown.contains(event.target)) {
      userDropdownOpen.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  stopFaceScanning() // Cleanup face recognition interval
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="isCheckingAuth" class="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 flex items-center justify-center">
    <div class="text-center">
      <svg class="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-slate-600 text-sm">Loading...</p>
    </div>
  </div>

  <!-- Login View -->
  <LoginView
    v-else-if="!isAuthenticated"
    :app-version="appVersion"
    @login-success="handleLoginSuccess"
  />

  <!-- Main Application with Sidebar/Topnav -->
  <div v-else class="kiosk-app h-screen flex flex-col overflow-hidden" style="background-color: #EEF2F7;">

    <!-- TOP NAVIGATION BAR -->
    <div class="topnav flex items-center justify-between px-4 shadow-md" style="height: 64px; background-color: #3073F1;">
      <!-- Logo / Home Button -->
      <button @click="handleHomeClick" class="flex items-center gap-3 hover:opacity-80 transition-opacity" title="Go to Home">
        <div class="logo-placeholder flex items-center justify-center rounded-lg" style="width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.15);">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div class="text-white">
          <h1 class="text-xl font-bold">{{ companyName }}</h1>
        </div>
      </button>

      <!-- Right side - User Menu -->
      <div class="flex items-center gap-3 relative">
        <button
          @click="toggleUserDropdown"
          class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        >
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-white text-blue-600 font-bold text-sm">
            {{ currentUserName.split(' ').map(n => n[0]).join('').toUpperCase() }}
          </div>
          <span class="text-white font-semibold">{{ currentUserName }}</span>
          <svg class="w-4 h-4 text-white transition-transform" :class="{ 'rotate-180': userDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="userDropdownOpen"
          class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50"
          @click.stop
        >
          <button
            @click="handleEmployeeList"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
            style="color: #313A46;"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="font-medium">Employee</span>
          </button>
          <button
            @click="handleSettings"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left border-t"
            style="color: #313A46; border-color: #EEF2F7;"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="font-medium">Settings</span>
          </button>
          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left border-t"
            style="color: #E63535; border-color: #EEF2F7;"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MAIN LAYOUT: Sidebar + Content -->
    <div class="flex flex-1 gap-4 p-4 overflow-hidden">
      <!-- LEFT SIDEBAR - Collapsible -->
      <div
        class="sidebar rounded-lg shadow-lg flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
        :class="sidebarCollapsed ? 'w-16' : 'w-64'"
        style="background-color: #3073F1;"
      >
      <!-- Sidebar Toggle Button -->
      <div class="flex items-center justify-between p-4 border-b" style="border-color: rgba(255, 255, 255, 0.2);">
        <h3 v-show="!sidebarCollapsed" class="font-bold text-white"></h3>
        <button
          @click="toggleSidebar"
          class="p-2 rounded-lg transition-colors text-white hover:bg-white hover:bg-opacity-10"
        >
          <svg v-if="!sidebarCollapsed" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Sidebar Buttons -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <!-- Timekeeper Button -->
        <button
          @click="handleHomeClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'kiosk' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'kiosk' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'kiosk' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'kiosk' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Timekeeper</span>
        </button>

        <!-- Overtime Button -->
        <button
          @click="handleOvertimeClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'overtime' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'overtime' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'overtime' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'overtime' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Overtime</span>
        </button>

        <!-- Leave Button -->
        <button
          @click="handleLeaveClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'leave' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'leave' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'leave' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'leave' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Leave</span>
        </button>

        <!-- Holiday Button -->
        <button
          @click="handleHolidayClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'holiday' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'holiday' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'holiday' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'holiday' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Holiday</span>
        </button>

        <!-- Restday Button -->
        <button
          @click="handleRestdayClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'restday' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'restday' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'restday' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'restday' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Restday</span>
        </button>

        <!-- Undertime Button -->
        <button
          @click="handleUndertimeClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'undertime' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'undertime' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'undertime' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'undertime' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Undertime</span>
        </button>

        <!-- Official Business Button - HIDDEN -->
        <!-- <button
          @click="handleOfficialBusinessClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'officialbusiness' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'officialbusiness' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'officialbusiness' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'officialbusiness' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Official Business</span>
        </button> -->

        <!-- Timelogs Button - HIDDEN -->
        <!-- <button
          @click="handleTimelogsClick"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all"
          :class="[
            sidebarCollapsed ? 'justify-center' : '',
            currentView === 'timelogs' ? 'bg-white text-blue-600 shadow-lg' : ''
          ]"
          :style="currentView === 'timelogs' ? '' : 'background-color: rgba(255, 255, 255, 0.15); color: white;'"
          @mouseover="currentView !== 'timelogs' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.25)' : ''"
          @mouseout="currentView !== 'timelogs' ? $event.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.15)' : ''"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span v-show="!sidebarCollapsed" class="font-semibold">Timelogs</span>
        </button> -->
      </div>

      <!-- Version Display at Bottom -->
      <div class="p-4 border-t" style="border-color: rgba(255, 255, 255, 0.2);">
        <div class="flex items-center justify-center gap-2">
          <svg v-show="!sidebarCollapsed" class="w-4 h-4 text-white opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-white text-sm opacity-70" :class="sidebarCollapsed ? 'text-xs' : ''">{{ appVersion }}</span>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT AREA - Dynamic view switching -->
    <div class="flex-1 overflow-hidden" style="min-height: 0">

      <!-- Kiosk View (Camera + Keypad + Logs) -->
      <div v-if="currentView === 'kiosk'" class="h-full grid grid-cols-2 gap-4">

      <!-- LEFT: Camera and Numpad -->
      <div class="left-section flex flex-col gap-3 h-full">
        <!-- Camera Section with Employee Validation Overlay -->
        <div class="camera-section relative bg-black rounded-lg overflow-hidden flex-shrink-0" style="height: 30vh">
          <!-- Camera Toggle Button -->
          <button
            @click="toggleCamera"
            class="absolute top-2 right-2 z-10 p-2 rounded-lg shadow-lg transition-all"
            :style="cameraEnabled ? 'background-color: #1CB454;' : 'background-color: #68625D;'"
            @mouseover="handleCameraToggleHover($event, true)"
            @mouseout="handleCameraToggleHover($event, false)"
            :title="cameraEnabled ? 'Disable Camera' : 'Enable Camera'"
          >
            <svg v-if="cameraEnabled" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <CameraView
            ref="cameraRef"
            :enabled="cameraEnabled"
            @ready="handleCameraReady"
            @error="handleCameraError"
          />

          <!-- Employee Validation Status Overlay -->
          <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div class="validation-status flex-shrink-0 px-2">
              <div
                v-if="employeeValidation.status === 'default'"
                class="flex items-center justify-center gap-2 text-white text-sm"
              >
                <span>{{ useFaceRecognition ? 'Face Recognition Mode' : 'Enter your code' }}</span>
              </div>

              <div
                v-else-if="employeeValidation.status === 'recognizing'"
                class="flex items-center justify-center gap-2 text-sm font-semibold text-blue-400"
              >
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ employeeValidation.employeeName || 'Scanning for face...' }}</span>
              </div>

              <div
                v-else-if="employeeValidation.status === 'not_found'"
                class="flex items-center justify-center gap-2 text-sm font-semibold"
                style="color: #E63535;"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Employee Not Found</span>
              </div>

              <div
                v-else-if="employeeValidation.status === 'found'"
                class="flex items-center justify-center gap-2 text-sm font-semibold"
                style="color: #1CB454;"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Employee Found: {{ employeeValidation.employeeName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mode Toggle Button -->
        <div class="flex-shrink-0">
          <button
            @click="toggleFaceRecognition"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all shadow-md"
            :class="useFaceRecognition
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!useFaceRecognition" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              <template v-else>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </template>
            </svg>
            {{ useFaceRecognition ? 'Using Face Recognition' : 'Use Face Recognition' }}
          </button>
        </div>

        <!-- Employee ID Input Field -->
        <div v-if="!useFaceRecognition" class="flex-shrink-0">
          <input
            ref="inputRef"
            v-model="employeeId"
            type="text"
            @input="handleKeyboardInput"
            placeholder="Enter Employee ID"
            maxlength="10"
            class="w-full text-center text-2xl font-bold border-2 rounded-lg p-3 bg-white focus:outline-none"
            style="border-color: #68625D; color: #313A46;"
            @focus="handleDateInputFocus($event, true)"
            @blur="handleDateInputFocus($event, false)"
          />
        </div>

        <!-- Face Recognition Instructions -->
        <div v-else class="flex-shrink-0 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div class="flex items-center justify-center gap-2 text-blue-800">
            <svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium">Look at the camera to identify yourself</span>
          </div>
        </div>

        <!-- Numeric Keypad -->
        <div v-if="!useFaceRecognition" class="numpad-section flex-shrink-0">
          <NumericKeypad
            @digit-click="handleDigitClick"
            @backspace="handleBackspace"
            @clear="handleClear"
          />
        </div>

        <!-- IN/OUT Buttons -->
        <div class="action-buttons flex gap-4 flex-shrink-0">
          <button
            @click="handleClockIn"
            :disabled="isProcessing || !employeeValidation.isValid"
            class="flex-1 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold text-2xl py-5 rounded-lg transition-colors duration-150 shadow-lg"
            :style="isProcessing || !employeeValidation.isValid ? 'background-color: #68625D;' : 'background-color: #1CB454;'"
            @mouseover="handleInButtonHover($event, true)"
            @mouseout="handleInButtonHover($event, false)"
          >
            <span v-if="!isProcessing">IN</span>
            <span v-else>Processing...</span>
          </button>

          <button
            @click="handleClockOut"
            :disabled="isProcessing || !employeeValidation.isValid"
            class="flex-1 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold text-2xl py-5 rounded-lg transition-colors duration-150 shadow-lg"
            :style="isProcessing || !employeeValidation.isValid ? 'background-color: #68625D;' : 'background-color: #E63535;'"
            @mouseover="handleOutButtonHover($event, true)"
            @mouseout="handleOutButtonHover($event, false)"
          >
            <span v-if="!isProcessing">OUT</span>
            <span v-else>Processing...</span>
          </button>
        </div>
      </div>

      <!-- RIGHT: Timesheet History Table -->
      <div class="right-section flex flex-col h-full bg-white rounded-lg border-4 p-4 overflow-hidden" style="border-color: #68625D;">
        <h3 class="text-lg font-bold mb-1" style="color: #313A46;">Timesheet History</h3>

        <!-- Date Range Filter -->
        <div class="flex gap-2 mb-3 items-center">
          <div class="flex items-center gap-1">
            <label class="text-xs font-semibold" style="color: #68625D;">From:</label>
            <input
              v-model="dateFrom"
              type="date"
              class="text-xs border rounded px-2 py-1 focus:outline-none"
              style="border-color: #68625D; color: #313A46;"
              @focus="handleDateInputFocus($event, true)"
              @blur="handleDateInputFocus($event, false)"
            />
          </div>
          <div class="flex items-center gap-1">
            <label class="text-xs font-semibold" style="color: #68625D;">To:</label>
            <input
              v-model="dateTo"
              type="date"
              class="text-xs border rounded px-2 py-1 focus:outline-none"
              style="border-color: #68625D; color: #313A46;"
              @focus="handleDateInputFocus($event, true)"
              @blur="handleDateInputFocus($event, false)"
            />
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <div class="text-xs" style="color: #68625D;">
              {{ recentLogs.length }} records
            </div>
            <!-- Sync Timesheets Button -->
            <button
              @click="handleTimesheetSync"
              :disabled="isSyncingTimesheets || unsyncedTimesheetsCount === 0"
              class="relative p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              :title="unsyncedTimesheetsCount > 0 ? `Sync ${unsyncedTimesheetsCount} unsynced timesheet(s)` : 'No timesheets to sync'"
            >
              <!-- Cloud upload icon -->
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'animate-pulse': isSyncingTimesheets }"
                style="color: #1CB454;"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <!-- Badge for unsynced count -->
              <span
                v-if="unsyncedTimesheetsCount > 0"
                class="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {{ unsyncedTimesheetsCount > 99 ? '99+' : unsyncedTimesheetsCount }}
              </span>
            </button>
            <!-- Refresh Button -->
            <button
              @click="handleRefresh"
              :disabled="isRefreshing"
              class="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh records"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'animate-spin': isRefreshing }"
                style="color: #3073F1;"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Table -->
        <div v-if="recentLogs.length > 0" class="flex-1 overflow-auto">
          <table class="w-full text-sm border-collapse">
            <thead class="sticky top-0 z-10" style="background-color: #EEF2F7;">
              <tr>
                <th class="border px-2 py-2 text-center font-bold" style="border-color: #68625D; color: #313A46; width: 40px;">Status</th>
                <th class="border px-2 py-2 text-left font-bold" style="border-color: #68625D; color: #313A46;">Name</th>
                <th class="border px-2 py-2 text-center font-bold" style="border-color: #68625D; color: #313A46;">Action</th>
                <th class="border px-2 py-2 text-left font-bold" style="border-color: #68625D; color: #313A46;">Date</th>
                <th class="border px-2 py-2 text-left font-bold" style="border-color: #68625D; color: #313A46;">Time</th>
                <th class="border px-2 py-2 text-center font-bold" style="border-color: #68625D; color: #313A46; width: 50px;">Resync</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(log, index) in recentLogs"
                :key="log.id"
                class="transition-colors"
                :style="index % 2 === 0 ? 'background-color: white;' : 'background-color: #EEF2F7;'"
                @mouseover="handleTableRowHover($event, index, true)"
                @mouseout="handleTableRowHover($event, index, false)"
              >
                <td class="border px-2 py-2 text-center" style="border-color: #68625D; width: 40px;"
                    :title="log.backend_timesheet_id ? `Synced to backend (ID: ${log.backend_timesheet_id})` : (log.sync_error_message || (log.status === 'error' ? (log.error_message || 'Local error') : 'Pending sync'))">
                  <!-- Green checkmark: Synced to backend -->
                  <svg v-if="log.backend_timesheet_id" class="w-4 h-4 mx-auto" style="color: #1CB454;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <!-- Red warning triangle: Local error or sync error -->
                  <svg v-else-if="log.status === 'error' || log.sync_error_message" class="w-4 h-4 mx-auto" style="color: #E63535;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <!-- Orange clock icon: Pending sync (not clickable) -->
                  <svg v-else class="w-4 h-4 mx-auto" style="color: #FFA500;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </td>
                <td class="border px-2 py-2 text-xs" style="border-color: #68625D; color: #313A46;">
                  {{ log.employee_number ? `${log.employee_number} - ${log.employee_name || '-'}` : (log.employee_name || '-') }}
                </td>
                <td class="border px-2 py-2 text-center" style="border-color: #68625D;">
                  <span
                    class="px-2 py-1 rounded text-xs font-semibold inline-block"
                    :style="log.action === 'IN' ? 'background-color: rgba(28, 180, 84, 0.1); color: #1CB454;' : 'background-color: rgba(230, 53, 53, 0.1); color: #E63535;'"
                  >
                    {{ log.action }}
                  </span>
                </td>
                <td class="border px-2 py-2 text-xs" style="border-color: #68625D; color: #313A46;">{{ formatDate(log.timestamp) }}</td>
                <td class="border px-2 py-2 text-xs" style="border-color: #68625D; color: #313A46;">{{ formatTime(log.timestamp) }}</td>
                <!-- Resync button for failed records -->
                <td class="border px-2 py-2 text-center" style="border-color: #68625D; width: 50px;">
                  <button
                    v-if="log.status === 'error' || log.sync_error_message"
                    @click="handleResyncTimesheet(log)"
                    :disabled="isSyncingTimesheets"
                    class="p-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                    title="Retry sync"
                  >
                    <svg class="w-4 h-4" :class="{ 'animate-spin': isSyncingTimesheets }" style="color: #E63535;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-else class="flex-1 flex items-center justify-center" style="color: #68625D;">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-xs">No history yet</p>
          </div>
        </div>
      </div>
      </div>
      <!-- End of Kiosk View -->

      <!-- Employee List View -->
      <EmployeeList v-else-if="currentView === 'employee'" />

      <!-- Overtime View -->
      <OvertimeView v-else-if="currentView === 'overtime'" />

      <!-- Leave View -->
      <LeaveView v-else-if="currentView === 'leave'" />

      <!-- Holiday View -->
      <HolidayView v-else-if="currentView === 'holiday'" />

      <!-- Restday View -->
      <RestdayView v-else-if="currentView === 'restday'" />

      <!-- Undertime View -->
      <UndertimeView v-else-if="currentView === 'undertime'" />

      <!-- Official Business View -->
      <OfficialBusinessView v-else-if="currentView === 'officialbusiness'" />

      <!-- Timelogs View -->
      <TimelogsView v-else-if="currentView === 'timelogs'" />

      <!-- Placeholder for unknown views -->
      <div v-else class="h-full flex items-center justify-center bg-white/50">
        <p class="text-slate-600">View not found: {{ currentView }}</p>
      </div>

    </div>
    <!-- End of MAIN CONTENT AREA -->

    </div>
    <!-- End of flex wrapper -->

    <!-- Toast Notification -->
    <ToastNotification
      :show="toastVisible"
      :message="toastMessage"
      :type="toastType"
      :duration="3000"
      @close="handleToastClose"
    />

    <!-- Global Toast Container for Application Modules -->
    <ToastContainer />
  </div>
</template>

<style scoped>
.kiosk-app {
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

button {
  -webkit-tap-highlight-color: transparent;
}

button:active:not(:disabled) {
  transform: scale(0.98);
}

.feature-btn {
  min-height: 50px;
  height: 100%;
}

.camera-section {
  min-height: 200px;
}

.left-column {
  min-width: 0; /* Allow flexbox to shrink properly */
}

.right-column {
  min-width: 0; /* Allow grid to shrink properly */
}
</style>
