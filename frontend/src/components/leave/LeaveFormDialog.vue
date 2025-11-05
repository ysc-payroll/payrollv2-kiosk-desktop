<template>
  <!-- Modal Overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <!-- Modal Container -->
    <div class="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">
            {{ mode === 'create' ? 'New Leave Request' : 'Edit Leave Request' }}
          </h3>
          <p class="mt-1 text-xs text-slate-600">
            {{ mode === 'create' ? 'Fill in the details below to create a new leave application' : 'Update the leave application details' }}
          </p>
        </div>
        <button
          @click="handleClose"
          class="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/50 hover:text-slate-600"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form Content -->
      <div class="overflow-y-auto p-6" style="max-height: calc(90vh - 180px)">
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Step 1: Employee (always visible) -->
            <div class="form-group">
              <label for="employee" class="block text-sm font-medium text-slate-700 mb-1">
                Employee <span class="text-red-500">*</span>
              </label>
              <select
                v-if="canSelectEmployee"
                v-model="formData.employee"
                @change="clearError('employee')"
                :disabled="!canSelectEmployee || mode === 'edit'"
                class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                :class="{ 'border-red-500': formErrors.employee }"
              >
                <option value="">Select an employee</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                  {{ emp.name }}
                </option>
              </select>
              <input
                v-else
                type="text"
                :value="currentEmployeeName"
                disabled
                class="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm cursor-not-allowed"
              />
              <span v-if="formErrors.employee" class="text-xs text-red-500 mt-1">{{ formErrors.employee }}</span>
            </div>

            <!-- Step 2: Leave Type (only if employee is selected) -->
            <div v-if="employeeSelected" class="form-group">
              <label for="leave_type" class="block text-sm font-medium text-slate-700 mb-1">
                Type of Leave <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formData.leave_type"
                @change="clearError('leave_type')"
                class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                :class="{ 'border-red-500': formErrors.leave_type }"
              >
                <option value="">Select leave type</option>
                <option v-for="type in leaveTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
              <span v-if="formErrors.leave_type" class="text-xs text-red-500 mt-1">{{ formErrors.leave_type }}</span>
            </div>

            <!-- Step 3: Terms - Whole Day / Half Day (only if leave type is selected) -->
            <div v-if="leaveTypeSelected" class="form-group">
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Terms <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-4">
                <label class="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    v-model="formData.terms"
                    value="wholeday"
                    @change="clearError('terms')"
                    class="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span class="ml-2 text-sm text-slate-700">Whole Day</span>
                </label>
                <label class="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    v-model="formData.terms"
                    value="halfday"
                    @change="clearError('terms')"
                    class="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span class="ml-2 text-sm text-slate-700">Halfday</span>
                </label>
              </div>
              <span v-if="formErrors.terms" class="text-xs text-red-500 mt-1">{{ formErrors.terms }}</span>
            </div>

            <!-- Step 4a: Date Range (Whole Day) -->
            <div v-if="leaveTypeSelected && isWholeDay" class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label for="start_date" class="block text-sm font-medium text-slate-700 mb-1">
                  Date From <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.start_date"
                  type="date"
                  @change="clearError('start_date')"
                  class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  :class="{ 'border-red-500': formErrors.start_date }"
                />
                <span v-if="formErrors.start_date" class="text-xs text-red-500 mt-1">{{ formErrors.start_date }}</span>
              </div>

              <div class="form-group">
                <label for="end_date" class="block text-sm font-medium text-slate-700 mb-1">
                  Date To <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.end_date"
                  type="date"
                  @change="clearError('end_date')"
                  :min="formData.start_date"
                  class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  :class="{ 'border-red-500': formErrors.end_date }"
                />
                <span v-if="formErrors.end_date" class="text-xs text-red-500 mt-1">{{ formErrors.end_date }}</span>
              </div>
            </div>

            <!-- Step 4b: Single Date (Half Day) -->
            <div v-if="leaveTypeSelected && isHalfDay" class="form-group">
              <label for="start_date" class="block text-sm font-medium text-slate-700 mb-1">
                Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.start_date"
                type="date"
                @change="clearError('start_date')"
                class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                :class="{ 'border-red-500': formErrors.start_date }"
              />
              <span v-if="formErrors.start_date" class="text-xs text-red-500 mt-1">{{ formErrors.start_date }}</span>
            </div>

            <!-- Step 5: Half Day Period (only for halfday) -->
            <div v-if="leaveTypeSelected && isHalfDay" class="form-group">
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Half Day Period <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-4">
                <label class="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    v-model="formData.halfday_is_first_half"
                    :value="true"
                    class="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span class="ml-2 text-sm text-slate-700">First Half</span>
                </label>
                <label class="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    v-model="formData.halfday_is_first_half"
                    :value="false"
                    class="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span class="ml-2 text-sm text-slate-700">Second Half</span>
                </label>
              </div>
            </div>

            <!-- Step 6: Reason (only if employee and leave type are selected) -->
            <div v-if="employeeSelected && leaveTypeSelected" class="form-group">
              <label for="reason" class="block text-sm font-medium text-slate-700 mb-1">
                Reason <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="formData.reason"
                @input="clearError('reason')"
                rows="3"
                placeholder="Enter reason here..."
                class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                :class="{ 'border-red-500': formErrors.reason }"
              ></textarea>
              <span v-if="formErrors.reason" class="text-xs text-red-500 mt-1">{{ formErrors.reason }}</span>
            </div>

            <!-- Step 7: Attachment (only if employee and leave type are selected, and in create mode) -->
            <div v-if="employeeSelected && leaveTypeSelected && mode === 'create'" class="form-group">
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Attachment (Optional)
              </label>
              <input
                type="file"
                @change="handleFileUpload"
                accept="image/*"
                class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p class="mt-1 text-xs text-slate-500">
                Upload supporting image (JPG, PNG, GIF, WebP, max 10MB)
              </p>

              <!-- Selected file preview -->
              <div v-if="selectedFile" class="mt-2 rounded-lg bg-slate-50 p-2">
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-sm text-slate-600">
                    {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
                  </span>
                </div>
              </div>
            </div>

            <!-- Edit mode: Show current attachment -->
            <div v-if="mode === 'edit' && selectedRecord?.has_attachment" class="form-group">
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Current Attachment
              </label>
              <div class="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span class="text-sm text-slate-600">Attachment on file</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
        <button
          @click="handleClose"
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="isSaving"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="isSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Saving...' : (mode === 'create' ? 'Create Request' : 'Update Request') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  mode: {
    type: String,
    default: 'create' // 'create' or 'edit'
  },
  selectedRecord: {
    type: Object,
    default: null
  },
  employees: {
    type: Array,
    default: () => []
  },
  leaveTypes: {
    type: Array,
    default: () => []
  },
  canSelectEmployee: {
    type: Boolean,
    default: true
  },
  isSaving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

// Form data
const formData = ref({
  employee: '',
  leave_type: '',
  terms: 'wholeday',
  start_date: '',
  end_date: '',
  halfday_is_first_half: true,
  reason: '',
  attachment: null
})

// File handling
const selectedFile = ref(null)

// Form errors
const formErrors = ref({
  employee: '',
  leave_type: '',
  terms: '',
  start_date: '',
  end_date: '',
  reason: ''
})

// Computed properties
const employeeSelected = computed(() => !!formData.value.employee)
const leaveTypeSelected = computed(() => !!formData.value.leave_type)
const isWholeDay = computed(() => formData.value.terms === 'wholeday')
const isHalfDay = computed(() => formData.value.terms === 'halfday')

const currentEmployeeName = computed(() => {
  if (props.selectedRecord?.employee_name) {
    return props.selectedRecord.employee_name
  }
  return 'Loading...'
})

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (props.mode === 'edit' && props.selectedRecord) {
      // Populate form with existing data
      formData.value = {
        employee: props.selectedRecord.employee_id || '',
        leave_type: props.selectedRecord.leave_type_id || '',
        terms: props.selectedRecord.terms || 'wholeday',
        start_date: props.selectedRecord.start_date || '',
        end_date: props.selectedRecord.end_date || '',
        halfday_is_first_half: props.selectedRecord.halfday_is_first_half ?? true,
        reason: props.selectedRecord.reason || '',
        attachment: null
      }
    } else {
      // Reset form for create mode
      resetForm()
    }
    // Clear errors
    clearAllErrors()
  }
})

// Watch for end_date to ensure it's not before start_date
watch(() => formData.value.start_date, (newStartDate) => {
  if (isWholeDay.value && formData.value.end_date && newStartDate) {
    if (newStartDate > formData.value.end_date) {
      formData.value.end_date = newStartDate
    }
  }
})

// Handle file upload
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    formData.value.attachment = file
  }
}

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Clear specific error
const clearError = (field) => {
  formErrors.value[field] = ''
}

// Clear all errors
const clearAllErrors = () => {
  Object.keys(formErrors.value).forEach(key => {
    formErrors.value[key] = ''
  })
}

// Validate form
const validateForm = () => {
  clearAllErrors()
  let isValid = true

  if (!formData.value.employee) {
    formErrors.value.employee = 'Employee is required'
    isValid = false
  }

  if (!formData.value.leave_type) {
    formErrors.value.leave_type = 'Leave type is required'
    isValid = false
  }

  if (!formData.value.terms) {
    formErrors.value.terms = 'Please select whole day or half day'
    isValid = false
  }

  if (!formData.value.start_date) {
    formErrors.value.start_date = 'Start date is required'
    isValid = false
  }

  if (isWholeDay.value && !formData.value.end_date) {
    formErrors.value.end_date = 'End date is required for whole day leave'
    isValid = false
  }

  if (isWholeDay.value && formData.value.start_date && formData.value.end_date) {
    if (formData.value.start_date > formData.value.end_date) {
      formErrors.value.end_date = 'End date must be after start date'
      isValid = false
    }
  }

  if (!formData.value.reason) {
    formErrors.value.reason = 'Reason is required'
    isValid = false
  }

  return isValid
}

// Handle submit
const handleSubmit = () => {
  if (!validateForm()) {
    return
  }

  emit('submit', {
    mode: props.mode,
    data: { ...formData.value }
  })
}

// Handle close
const handleClose = () => {
  emit('close')
}

// Reset form
const resetForm = () => {
  formData.value = {
    employee: '',
    leave_type: '',
    terms: 'wholeday',
    start_date: '',
    end_date: '',
    halfday_is_first_half: true,
    reason: '',
    attachment: null
  }
  selectedFile.value = null
}
</script>
