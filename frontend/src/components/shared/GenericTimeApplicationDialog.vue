<template>
  <!-- Modal Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="handleClose"
  >
    <!-- Modal Content -->
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto"
      :class="getModalWidth"
    >
      <!-- Header -->
      <div class="p-6 border-b border-slate-200">
        <h2 class="text-2xl font-bold text-slate-900">{{ modalTitle }}</h2>
      </div>

      <!-- Body -->
      <div class="p-6">
        <!-- CREATE/EDIT FORM -->
        <div v-if="mode === 'create' || mode === 'edit'" class="space-y-6">
          <!-- Employee Selection (for admins) -->
          <div v-if="canSelectEmployee">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Employee <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.employee"
              class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              :class="{ 'border-red-300': formErrors.employee }"
            >
              <option value="">Select Employee</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.name }}
              </option>
            </select>
            <p v-if="formErrors.employee" class="mt-1 text-sm text-red-600">{{ formErrors.employee }}</p>
          </div>

          <!-- Application Date -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              {{ config.dateLabel }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.application_date"
              type="date"
              class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              :class="{ 'border-red-300': formErrors.application_date }"
            />
            <p v-if="formErrors.application_date" class="mt-1 text-sm text-red-600">{{ formErrors.application_date }}</p>
          </div>

          <!-- Time Input -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Hours <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="formData.applied_time_hours"
                type="number"
                min="0"
                max="23"
                class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                :class="{ 'border-red-300': formErrors.applied_time }"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Minutes <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="formData.applied_time_minutes"
                type="number"
                min="0"
                max="59"
                class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                :class="{ 'border-red-300': formErrors.applied_time }"
              />
            </div>
          </div>
          <p v-if="formErrors.applied_time" class="mt-1 text-sm text-red-600">{{ formErrors.applied_time }}</p>

          <!-- Reason -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Reason
            </label>
            <textarea
              v-model="formData.reason"
              rows="3"
              maxlength="250"
              class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none"
              :placeholder="config.reasonPlaceholder"
            ></textarea>
            <p class="mt-1 text-xs text-slate-500">{{ formData.reason?.length || 0 }}/250 characters</p>
          </div>

          <!-- File Attachment -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Attachment (optional)
            </label>
            <input
              type="file"
              ref="fileInput"
              accept="image/*"
              @change="handleFileSelect"
              class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p class="mt-1 text-xs text-slate-500">Images only, max 10MB</p>
            <p v-if="formErrors.attachment" class="mt-1 text-sm text-red-600">{{ formErrors.attachment }}</p>
          </div>
        </div>

        <!-- VIEW DETAILS -->
        <div v-else-if="mode === 'view' && selectedRecord" class="space-y-6">
          <!-- Basic Info Grid -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-slate-500">Employee</p>
              <p class="mt-1 text-base text-slate-900">{{ selectedRecord.employee }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Status</p>
              <p class="mt-1">
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  :class="getStatusClass(selectedRecord.status)"
                >
                  {{ selectedRecord.status_display }}
                </span>
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Request Date</p>
              <p class="mt-1 text-base text-slate-900">{{ selectedRecord.requested_date }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">{{ config.dateLabel }}</p>
              <p class="mt-1 text-base text-slate-900">{{ selectedRecord.application_date }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Applied Time</p>
              <p class="mt-1 text-base text-slate-900">{{ selectedRecord.applied_display }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Approved Time</p>
              <p class="mt-1 text-base text-slate-900">{{ selectedRecord.approved_display || 'N/A' }}</p>
            </div>
          </div>

          <!-- Reason -->
          <div v-if="selectedRecord.reason">
            <p class="text-sm font-medium text-slate-500">Reason</p>
            <p class="mt-1 text-base text-slate-900">{{ selectedRecord.reason }}</p>
          </div>

          <!-- Attachment -->
          <div v-if="selectedRecord.has_attachment">
            <p class="text-sm font-medium text-slate-500 mb-2">Attachment</p>
            <div class="flex items-center gap-3">
              <span class="text-sm text-slate-900">{{ selectedRecord.attachment_display_filename }}</span>
              <span class="text-xs text-slate-500">({{ selectedRecord.attachment_size_mb?.toFixed(2) }} MB)</span>
              <a
                :href="`http://localhost:8000${selectedRecord.attachment_url}`"
                target="_blank"
                class="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                View
              </a>
            </div>
          </div>

          <!-- Workflow Timeline -->
          <div class="border-t border-slate-200 pt-6">
            <p class="text-sm font-medium text-slate-700 mb-4">Approval Timeline</p>
            <div class="space-y-4">
              <!-- Reviewed -->
              <div v-if="selectedRecord.reviewed_by" class="flex gap-4">
                <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-purple-500"></div>
                <div>
                  <p class="text-sm font-medium text-slate-900">Reviewed</p>
                  <p class="text-sm text-slate-600">by {{ selectedRecord.reviewed_by }} on {{ selectedRecord.reviewed_date }}</p>
                  <p v-if="selectedRecord.reviewed_remarks" class="text-sm text-slate-500 mt-1">{{ selectedRecord.reviewed_remarks }}</p>
                </div>
              </div>

              <!-- Approved -->
              <div v-if="selectedRecord.approved_by" class="flex gap-4">
                <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                <div>
                  <p class="text-sm font-medium text-slate-900">Approved</p>
                  <p class="text-sm text-slate-600">by {{ selectedRecord.approved_by }} on {{ selectedRecord.approved_date }}</p>
                  <p v-if="selectedRecord.approved_remarks" class="text-sm text-slate-500 mt-1">{{ selectedRecord.approved_remarks }}</p>
                </div>
              </div>

              <!-- Disapproved -->
              <div v-if="selectedRecord.disapproved_by" class="flex gap-4">
                <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                <div>
                  <p class="text-sm font-medium text-slate-900">Disapproved</p>
                  <p class="text-sm text-slate-600">by {{ selectedRecord.disapproved_by }} on {{ selectedRecord.disapproved_date }}</p>
                  <p v-if="selectedRecord.disapproved_remarks" class="text-sm text-slate-500 mt-1">{{ selectedRecord.disapproved_remarks }}</p>
                </div>
              </div>

              <!-- Cancelled -->
              <div v-if="selectedRecord.cancelled_by" class="flex gap-4">
                <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-slate-500"></div>
                <div>
                  <p class="text-sm font-medium text-slate-900">Cancelled</p>
                  <p class="text-sm text-slate-600">by {{ selectedRecord.cancelled_by }} on {{ selectedRecord.cancelled_date }}</p>
                  <p v-if="selectedRecord.cancelled_remarks" class="text-sm text-slate-500 mt-1">{{ selectedRecord.cancelled_remarks }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CANCEL CONFIRMATION -->
        <div v-else-if="mode === 'cancel'" class="space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 class="text-lg font-medium text-slate-900">{{ config.titles.cancel }}</h3>
            <p class="text-sm text-slate-600 mt-1">Please provide a reason for cancellation.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Cancellation Remarks <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="cancelRemarks"
              rows="3"
              maxlength="250"
              class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none"
              placeholder="Reason for cancellation..."
            ></textarea>
            <p class="mt-1 text-xs text-slate-500">{{ cancelRemarks?.length || 0 }}/250 characters</p>
          </div>
        </div>

        <!-- DELETE CONFIRMATION -->
        <div v-else-if="mode === 'delete'" class="space-y-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 class="text-lg font-medium text-slate-900">{{ config.deleteConfirmation.title }}</h3>
            <p class="text-sm text-slate-600 mt-1">{{ config.deleteConfirmation.message }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-slate-200 flex gap-3 justify-end">
        <button
          @click="handleClose"
          class="px-6 py-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          {{ mode === 'view' ? 'Close' : 'Cancel' }}
        </button>
        <button
          v-if="mode !== 'view'"
          @click="handleSubmit"
          :disabled="isSaving || (mode === 'cancel' && !cancelRemarks)"
          class="px-6 py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          :class="getSubmitButtonClass"
        >
          {{ getSubmitButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  mode: {
    type: String,
    default: 'create' // 'create', 'edit', 'view', 'cancel', 'delete'
  },
  selectedRecord: Object,
  employees: {
    type: Array,
    default: () => []
  },
  canSelectEmployee: Boolean,
  isSaving: Boolean,
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'submit'])

const formData = ref({
  employee: '',
  application_date: '',
  applied_time_hours: 0,
  applied_time_minutes: 0,
  reason: '',
  attachment: null
})
const formErrors = ref({})
const fileInput = ref(null)
const cancelRemarks = ref('')

// Modal title
const modalTitle = computed(() => {
  return props.config.titles[props.mode] || props.config.resourceName
})

// Modal width
const getModalWidth = computed(() => {
  return props.mode === 'view' ? 'max-w-3xl' : 'max-w-2xl'
})

// Submit button styling
const getSubmitButtonClass = computed(() => {
  if (props.mode === 'delete') return 'bg-red-500 hover:bg-red-600'
  if (props.mode === 'cancel') return 'bg-amber-500 hover:bg-amber-600'
  return 'bg-blue-500 hover:bg-blue-600'
})

// Submit button text
const getSubmitButtonText = computed(() => {
  if (props.isSaving) return 'Saving...'
  const texts = {
    create: 'Submit',
    edit: 'Update',
    cancel: 'Confirm Cancellation',
    delete: 'Delete'
  }
  return texts[props.mode] || 'Submit'
})

// Status badge class
const getStatusClass = (status) => {
  const classes = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    disapproved: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  }
  return classes[status] || 'bg-slate-100 text-slate-800'
}

// Watch for mode/record changes to populate form
watch(() => [props.mode, props.selectedRecord], () => {
  if (props.mode === 'edit' && props.selectedRecord) {
    // Parse date
    let dateStr = props.selectedRecord.application_date
    if (dateStr.includes(',')) {
      const date = new Date(dateStr)
      dateStr = date.toISOString().split('T')[0]
    }

    formData.value = {
      employee: props.selectedRecord.employee || '',
      application_date: dateStr,
      applied_time_hours: props.selectedRecord.applied_time_hours || 0,
      applied_time_minutes: props.selectedRecord.applied_time_minutes || 0,
      reason: props.selectedRecord.reason || '',
      attachment: null
    }
  } else if (props.mode === 'create') {
    formData.value = {
      employee: '',
      application_date: '',
      applied_time_hours: 0,
      applied_time_minutes: 0,
      reason: '',
      attachment: null
    }
  }

  cancelRemarks.value = ''
  formErrors.value = {}
}, { immediate: true })

// File handling
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      formErrors.value.attachment = 'File size must be less than 10MB'
      event.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      formErrors.value.attachment = 'Only image files are allowed'
      event.target.value = ''
      return
    }
    formData.value.attachment = file
    formErrors.value.attachment = ''
  }
}

// Validation
const validateForm = () => {
  formErrors.value = {}

  if (props.canSelectEmployee && !formData.value.employee) {
    formErrors.value.employee = 'Please select an employee'
  }
  if (!formData.value.application_date) {
    formErrors.value.application_date = `${props.config.dateLabel.replace(' Date', '')} date is required`
  }
  if (formData.value.applied_time_hours === 0 && formData.value.applied_time_minutes === 0) {
    formErrors.value.applied_time = 'Hours or minutes must be greater than zero'
  }

  return Object.keys(formErrors.value).length === 0
}

// Handlers
const handleClose = () => {
  emit('close')
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleSubmit = () => {
  if (props.mode === 'create' || props.mode === 'edit') {
    if (!validateForm()) return
    emit('submit', { mode: props.mode, data: formData.value })
  } else if (props.mode === 'cancel') {
    emit('submit', { mode: 'cancel', remarks: cancelRemarks.value })
  } else if (props.mode === 'delete') {
    emit('submit', { mode: 'delete' })
  }
}
</script>
