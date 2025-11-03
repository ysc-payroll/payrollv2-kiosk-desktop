<script setup>
import { ref, onMounted, watch } from 'vue'
import CameraView from './components/CameraView.vue'
import NumericKeypad from './components/NumericKeypad.vue'
import ToastNotification from './components/ToastNotification.vue'

// Component refs
const cameraRef = ref(null)
const inputRef = ref(null)

// State
const employeeId = ref('')
const cameraReady = ref(false)
const isProcessing = ref(false)

// Employee validation state
const employeeValidation = ref({
  status: 'default', // 'default' | 'not_found' | 'found'
  employeeName: '',
  isValid: false
})

// Toast state
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref('info')

// Timesheet logs state
const recentLogs = ref([])

// PyQt Bridge
let kioskBridge = null

onMounted(() => {
  // Initialize QWebChannel bridge for PyQt communication
  if (window.qt && window.qt.webChannelTransport) {
    new window.QWebChannel(window.qt.webChannelTransport, (channel) => {
      kioskBridge = channel.objects.kioskBridge
      console.log('PyQt bridge connected')

      // Load recent logs after bridge is ready
      loadRecentLogs()
    })
  } else {
    console.warn('PyQt bridge not available - running in browser mode')
  }

  // Auto-focus input field on mount
  focusInput()
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

      if (result.success && result.employee) {
        // Employee found
        employeeValidation.value = {
          status: 'found',
          employeeName: result.employee.name,
          isValid: true
        }
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

  if (!cameraReady.value) {
    showToast('Camera not ready', 'error')
    return
  }

  if (isProcessing.value) {
    return // Prevent double-clicks
  }

  isProcessing.value = true

  try {
    // Capture photo
    const photoBase64 = cameraRef.value.capturePhoto()

    // Send to Python backend
    if (kioskBridge && kioskBridge.logTimeEntry) {
      const resultJson = await kioskBridge.logTimeEntry(
        employeeId.value,
        action,
        photoBase64
      )

      const result = JSON.parse(resultJson)

      if (result.success) {
        showToast(result.message, 'success')
        // Reset for next employee
        employeeId.value = ''
        focusInput()
        // Reload recent logs
        loadRecentLogs()
      } else {
        showToast(result.message, 'error')
      }
    } else {
      // Browser mode - simulate success
      console.log('Browser mode - simulating success', {
        employeeId: employeeId.value,
        action,
        photoLength: photoBase64.length
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

// Load recent timesheet logs
const loadRecentLogs = async () => {
  try {
    if (kioskBridge && kioskBridge.getRecentLogs) {
      const resultJson = await kioskBridge.getRecentLogs(20)
      const result = JSON.parse(resultJson)

      if (result.success) {
        recentLogs.value = result.logs
        console.log('Loaded recent logs:', result.logs.length)
      } else {
        console.error('Failed to load logs:', result.error)
      }
    }
  } catch (error) {
    console.error('Error loading recent logs:', error)
  }
}

// Feature button handlers (placeholders)
const handleFeatureClick = (featureName) => {
  showToast(`${featureName} - Coming in Phase 2`, 'info')
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
</script>

<template>
  <div class="kiosk-app bg-gray-100 h-screen grid grid-cols-2 gap-4 p-4 overflow-hidden">

    <!-- LEFT COLUMN -->
    <div class="left-column flex flex-col gap-3 h-full">
      <!-- Camera Section with Employee ID Overlay -->
      <div class="camera-section relative bg-black rounded-lg overflow-hidden flex-shrink-0" style="height: 30vh">
        <CameraView
          ref="cameraRef"
          @ready="handleCameraReady"
          @error="handleCameraError"
        />

        <!-- Employee ID Input Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <input
            ref="inputRef"
            v-model="employeeId"
            type="text"
            @input="handleKeyboardInput"
            placeholder="Enter Employee ID"
            maxlength="10"
            class="w-full text-center text-2xl font-bold border-2 border-white/50 rounded-lg p-3 bg-white/90 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      <!-- Employee Validation Status -->
      <div class="validation-status flex-shrink-0 px-2">
        <div
          v-if="employeeValidation.status === 'default'"
          class="flex items-center justify-center gap-2 text-gray-500 text-sm"
        >
          <span>Enter your code</span>
        </div>

        <div
          v-else-if="employeeValidation.status === 'not_found'"
          class="flex items-center justify-center gap-2 text-red-600 text-sm font-semibold"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Employee Not Found</span>
        </div>

        <div
          v-else-if="employeeValidation.status === 'found'"
          class="flex items-center justify-center gap-2 text-green-600 text-sm font-semibold"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Employee: {{ employeeValidation.employeeName }}</span>
        </div>
      </div>

      <!-- Numeric Keypad -->
      <div class="numpad-section flex-shrink-0">
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
          class="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold text-2xl py-5 rounded-lg transition-colors duration-150 shadow-lg"
        >
          <span v-if="!isProcessing">IN</span>
          <span v-else>Processing...</span>
        </button>

        <button
          @click="handleClockOut"
          :disabled="isProcessing || !employeeValidation.isValid"
          class="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold text-2xl py-5 rounded-lg transition-colors duration-150 shadow-lg"
        >
          <span v-if="!isProcessing">OUT</span>
          <span v-else>Processing...</span>
        </button>
      </div>

      <!-- Timesheet History -->
      <div class="timesheet-history flex-1 bg-white rounded-lg border-4 border-gray-300 p-4 flex flex-col min-h-0">
        <h3 class="text-lg font-bold text-gray-700 mb-1">Timesheet History</h3>
        <p class="text-gray-500 text-xs mb-3">Last 20 time in/out ({{ recentLogs.length }} records)</p>

        <!-- Logs List -->
        <div v-if="recentLogs.length > 0" class="flex-1 overflow-y-auto">
          <div
            v-for="log in recentLogs"
            :key="log.id"
            class="flex items-center justify-between py-2 px-3 mb-1 rounded hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-gray-800">{{ log.employee_id }}</span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-xs font-semibold',
                    log.action === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  ]"
                >
                  {{ log.action }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ formatTimestamp(log.timestamp) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex-1 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-xs">No history yet</p>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN - Feature Buttons Grid -->
    <div class="right-column grid grid-cols-2 gap-4 content-start">
      <!-- Row 1 -->
      <button
        @click="handleFeatureClick('Overtime')"
        class="feature-btn bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Overtime
      </button>
      <button
        @click="handleFeatureClick('Leave')"
        class="feature-btn bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Leave
      </button>

      <!-- Row 2 -->
      <button
        @click="handleFeatureClick('Holiday')"
        class="feature-btn bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Holiday
      </button>
      <button
        @click="handleFeatureClick('Restday')"
        class="feature-btn bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Restday
      </button>

      <!-- Row 3 -->
      <button
        @click="handleFeatureClick('Undertime')"
        class="feature-btn bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Undertime
      </button>
      <button
        @click="handleFeatureClick('Official Business')"
        class="feature-btn bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Official Business
      </button>

      <!-- Row 4 -->
      <div></div>
      <button
        @click="handleFeatureClick('Timelogs')"
        class="feature-btn bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-bold text-xl py-8 rounded-lg transition-colors duration-150 shadow-lg"
      >
        Timelogs
      </button>
    </div>

    <!-- Toast Notification -->
    <ToastNotification
      :show="toastVisible"
      :message="toastMessage"
      :type="toastType"
      :duration="3000"
      @close="handleToastClose"
    />
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
  min-height: 100px;
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
