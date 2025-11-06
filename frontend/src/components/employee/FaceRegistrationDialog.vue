<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div class="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            {{ hasExisting ? 'Update' : 'Register' }} Face Recognition
          </h2>
          <p class="text-sm text-slate-600 mt-0.5">
            {{ employee?.name || 'Employee' }}
          </p>
        </div>
        <button
          @click="handleClose"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6">
        <!-- Existing Registration Info -->
        <div v-if="hasExisting && !isCapturing" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="h-5 w-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-amber-900">Face Already Registered</p>
              <p class="text-xs text-amber-700 mt-0.5">
                Registered on {{ formatDate(registrationDate) }}. Capturing a new photo will replace the existing registration.
              </p>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div v-if="!isCapturing && !capturedPhoto" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 class="text-sm font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul class="text-xs text-blue-800 space-y-1">
            <li>• Ensure good lighting and face the camera directly</li>
            <li>• Remove glasses or masks if possible</li>
            <li>• Only one face should be visible in the photo</li>
            <li>• Keep a neutral expression</li>
          </ul>
        </div>

        <!-- Camera Preview or Captured Photo -->
        <div class="relative bg-slate-900 rounded-lg overflow-hidden mb-4" style="aspect-ratio: 4/3;">
          <video
            v-if="!capturedPhoto"
            ref="videoElement"
            autoplay
            playsinline
            class="w-full h-full object-cover"
          ></video>

          <img
            v-else
            :src="capturedPhoto"
            class="w-full h-full object-cover"
            alt="Captured face"
          />

          <!-- Face Detection Overlay -->
          <div
            v-if="!capturedPhoto && isCameraReady"
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div class="relative w-64 h-64 border-2 border-green-400 rounded-full">
              <div class="absolute inset-0 bg-green-400/10 rounded-full animate-pulse"></div>
              <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                Align your face here
              </div>
            </div>
          </div>

          <!-- Camera Status -->
          <div v-if="!isCameraReady && !capturedPhoto" class="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div class="text-center text-white">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3"></div>
              <p class="text-sm">Initializing camera...</p>
            </div>
          </div>
        </div>

        <!-- Status Message -->
        <div v-if="statusMessage" class="mb-4 p-3 rounded-lg" :class="statusClass">
          <p class="text-sm font-medium">{{ statusMessage }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3">
          <button
            v-if="!capturedPhoto"
            @click="handleClose"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            :disabled="isProcessing"
          >
            Cancel
          </button>

          <button
            v-if="capturedPhoto"
            @click="retakePhoto"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            :disabled="isProcessing"
          >
            <svg class="inline h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retake Photo
          </button>

          <button
            v-if="!capturedPhoto"
            @click="capturePhoto"
            :disabled="!isCameraReady || isProcessing"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="inline h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Capture Photo
          </button>

          <button
            v-if="capturedPhoto"
            @click="registerFace"
            :disabled="isProcessing"
            class="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isProcessing" class="flex items-center">
              <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ hasExisting ? 'Update' : 'Register' }} Face
            </span>
            <span v-else class="flex items-center">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  employee: {
    type: Object,
    required: true
  },
  hasExisting: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'success'])

// Refs
const videoElement = ref(null)
const isCameraReady = ref(false)
const isCapturing = ref(false)
const capturedPhoto = ref(null)
const statusMessage = ref('')
const statusClass = ref('')
const isProcessing = ref(false)
let mediaStream = null

// Initialize camera
const initCamera = async () => {
  try {
    isCameraReady.value = false
    statusMessage.value = ''

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    })

    if (videoElement.value) {
      videoElement.value.srcObject = stream
      mediaStream = stream

      // Wait for video to be ready
      videoElement.value.onloadedmetadata = () => {
        isCameraReady.value = true
      }
    }
  } catch (error) {
    console.error('Camera initialization error:', error)
    statusMessage.value = 'Failed to access camera. Please check permissions.'
    statusClass.value = 'bg-red-50 border border-red-200 text-red-800'
  }
}

// Stop camera
const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  if (videoElement.value) {
    videoElement.value.srcObject = null
  }
  isCameraReady.value = false
}

// Capture photo
const capturePhoto = () => {
  if (!videoElement.value || !isCameraReady.value) return

  const canvas = document.createElement('canvas')
  canvas.width = videoElement.value.videoWidth
  canvas.height = videoElement.value.videoHeight

  const context = canvas.getContext('2d')
  context.drawImage(videoElement.value, 0, 0)

  capturedPhoto.value = canvas.toDataURL('image/png')
  isCapturing.value = true

  // Stop camera to save resources
  stopCamera()
}

// Retake photo
const retakePhoto = () => {
  capturedPhoto.value = null
  isCapturing.value = false
  statusMessage.value = ''

  // Restart camera
  setTimeout(() => {
    initCamera()
  }, 100)
}

// Register face
const registerFace = async () => {
  if (!capturedPhoto.value || !props.employee?.id) return

  isProcessing.value = true
  statusMessage.value = 'Processing face registration...'
  statusClass.value = 'bg-blue-50 border border-blue-200 text-blue-800'

  try {
    // Call bridge method to register face
    const resultJson = await window.kioskBridge.registerFaceEncoding(
      props.employee.id,
      capturedPhoto.value
    )

    const result = JSON.parse(resultJson)

    if (result.success) {
      statusMessage.value = result.message || 'Face registered successfully!'
      statusClass.value = 'bg-green-50 border border-green-200 text-green-800'

      // Emit success and close after a brief delay
      setTimeout(() => {
        isProcessing.value = false  // Reset processing state before closing
        emit('success')
        handleClose()
      }, 1500)
    } else {
      statusMessage.value = result.message || 'Face registration failed'
      statusClass.value = 'bg-red-50 border border-red-200 text-red-800'
      isProcessing.value = false
    }
  } catch (error) {
    console.error('Face registration error:', error)
    statusMessage.value = 'Error during face registration. Please try again.'
    statusClass.value = 'bg-red-50 border border-red-200 text-red-800'
    isProcessing.value = false
  }
}

// Close dialog
const handleClose = () => {
  if (isProcessing.value) return

  stopCamera()
  capturedPhoto.value = null
  isCapturing.value = false
  statusMessage.value = ''
  emit('close')
}

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// Watch for dialog open/close
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initCamera()
    }, 100)
  } else {
    stopCamera()
    capturedPhoto.value = null
    isCapturing.value = false
    statusMessage.value = ''
    isProcessing.value = false
  }
})

// Cleanup on unmount
onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
