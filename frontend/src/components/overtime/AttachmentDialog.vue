<template>
  <!-- Modal Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="handleClose"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="p-6 border-b border-slate-200 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-slate-900">Attachment</h2>
        <button
          @click="handleClose"
          class="text-slate-400 hover:text-slate-600 transition"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6">
        <!-- Loading state -->
        <div v-if="isLoading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>

        <!-- No attachment -->
        <div v-else-if="!hasAttachment && !isUploading" class="text-center py-12">
          <svg class="mx-auto h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <p class="mt-4 text-slate-600">No attachment available</p>

          <!-- Upload option if editable -->
          <div v-if="canEdit" class="mt-6">
            <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Attachment
              <input type="file" @change="handleFileSelect" accept="image/*" class="hidden" />
            </label>
          </div>
        </div>

        <!-- Has attachment - show image -->
        <div v-else-if="hasAttachment && !isUploading">
          <!-- Attachment info -->
          <div v-if="attachmentInfo" class="mb-4 p-4 bg-slate-50 rounded-lg">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-slate-600">Filename:</span>
                <span class="ml-2 font-medium">{{ attachmentInfo.original_filename }}</span>
              </div>
              <div v-if="attachmentInfo.attachment_size_mb">
                <span class="text-slate-600">Size:</span>
                <span class="ml-2 font-medium">{{ attachmentInfo.attachment_size_mb.toFixed(2) }} MB</span>
              </div>
            </div>
          </div>

          <!-- Image preview -->
          <div class="border border-slate-200 rounded-lg overflow-hidden">
            <img v-if="imageUrl" :src="imageUrl" alt="Attachment" class="w-full h-auto" />
          </div>

          <!-- Actions -->
          <div class="mt-4 flex gap-3">
            <button
              @click="handleDownload"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>

            <label v-if="canEdit" class="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Replace
              <input type="file" @change="handleFileSelect" accept="image/*" class="hidden" />
            </label>
          </div>
        </div>

        <!-- Uploading state -->
        <div v-else-if="isUploading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-4 text-slate-600">Uploading attachment...</p>
        </div>

        <!-- Error message -->
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {{ errorMessage }}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-slate-200 flex justify-end">
        <button
          @click="handleClose"
          class="px-6 py-2 text-slate-700 hover:text-slate-900 transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import apiService from '../../services/api'

const props = defineProps({
  isOpen: Boolean,
  recordId: Number,
  recordData: Object
})

const emit = defineEmits(['close', 'attachment-changed'])

const isLoading = ref(false)
const isUploading = ref(false)
const hasAttachment = ref(false)
const attachmentInfo = ref(null)
const imageUrl = ref(null)
const errorMessage = ref('')

const canEdit = computed(() => {
  return props.recordData?.is_editable || false
})

// Watch for dialog open/close
watch(() => props.isOpen, (newValue) => {
  if (newValue && props.recordId) {
    loadAttachmentInfo()
  } else {
    // Reset state when closing
    imageUrl.value = null
    errorMessage.value = ''
  }
})

const loadAttachmentInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // Get attachment metadata first
    const infoResult = await apiService.getOvertimeAttachmentInfo(props.recordId)

    if (infoResult.success && infoResult.data) {
      attachmentInfo.value = infoResult.data
      hasAttachment.value = infoResult.data.has_attachment || false

      // If has attachment, get the actual file
      if (hasAttachment.value) {
        // Call the attachment endpoint to get the pre-signed URL or file
        console.log('Fetching attachment for record:', props.recordId)
        const attachmentResult = await apiService.getOvertimeAttachment(props.recordId)

        console.log('Attachment result:', attachmentResult)

        if (attachmentResult.success) {
          console.log('Creating object URL from blob:', attachmentResult.blob)
          // Create object URL from blob
          imageUrl.value = URL.createObjectURL(attachmentResult.blob)
          console.log('Image URL created:', imageUrl.value)
        } else {
          console.error('Failed to get attachment:', attachmentResult)
          errorMessage.value = attachmentResult.message || 'Failed to load attachment'
        }
      }
    } else {
      // No attachment info, treat as no attachment
      hasAttachment.value = false
      attachmentInfo.value = null
    }
  } catch (error) {
    errorMessage.value = 'Failed to load attachment information'
    console.error('Error loading attachment:', error)
  } finally {
    isLoading.value = false
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file
  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Please select an image file (JPG, PNG, GIF, WebP)'
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = 'File size must be less than 10MB'
    return
  }

  isUploading.value = true
  errorMessage.value = ''

  try {
    const result = await apiService.replaceOvertimeAttachment(props.recordId, file)

    if (result.success) {
      // Reload attachment info
      await loadAttachmentInfo()

      // Emit change event
      emit('attachment-changed', {
        recordId: props.recordId,
        hasAttachment: true
      })
    } else {
      errorMessage.value = result.message || 'Failed to upload attachment'
    }
  } catch (error) {
    errorMessage.value = 'Failed to upload attachment'
    console.error('Error uploading attachment:', error)
  } finally {
    isUploading.value = false
    // Reset file input
    event.target.value = ''
  }
}

const handleDownload = async () => {
  try {
    // Use the API service to get the attachment (handles redirect properly)
    const result = await apiService.getOvertimeAttachment(props.recordId)

    if (result.success) {
      // Create download link
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename || attachmentInfo.value?.original_filename || 'attachment'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      errorMessage.value = result.message || 'Failed to download attachment'
    }
  } catch (error) {
    errorMessage.value = 'Failed to download attachment'
    console.error('Error downloading attachment:', error)
  }
}

const handleClose = () => {
  // Clean up object URL
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  emit('close')
}
</script>
