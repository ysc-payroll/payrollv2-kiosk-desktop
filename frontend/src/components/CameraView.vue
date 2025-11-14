<template>
  <div class="camera-container">
    <video
      ref="videoElement"
      autoplay
      playsinline
      class="w-full h-full object-cover bg-gray-900"
      :style="{ transform: mirrored ? 'scaleX(-1)' : 'none' }"
    ></video>
    <canvas ref="canvasElement" class="hidden"></canvas>

    <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
      <div class="text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-xl font-semibold">Camera Error</p>
        <p class="text-sm mt-2 text-gray-400">{{ error }}</p>
      </div>
    </div>

    <div v-if="!enabled" class="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
      <div class="text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p class="text-xl font-semibold">Camera Disabled</p>
        <p class="text-sm mt-2 text-gray-400">Enable camera to capture photos</p>
      </div>
    </div>

    <div v-else-if="!cameraReady && !error" class="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p>Initializing camera...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true
  },
  mirrored: {
    type: Boolean,
    default: true  // Default to mirrored (like a mirror)
  },
  lowResolution: {
    type: Boolean,
    default: false  // Use lower resolution for performance (face recognition scanning)
  }
})

const videoElement = ref(null)
const canvasElement = ref(null)
const cameraReady = ref(false)
const error = ref(null)
let stream = null

const emit = defineEmits(['ready', 'error'])

const startCamera = async () => {
  if (!props.enabled) return

  try {
    // Use lower resolution for face scanning to improve performance on lower-spec machines
    const resolution = props.lowResolution
      ? { width: { ideal: 640 }, height: { ideal: 480 } }  // Lower resolution for face recognition
      : { width: { ideal: 1280 }, height: { ideal: 720 } } // Full resolution for photos

    // Request camera access
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        ...resolution,
        facingMode: 'user'
      },
      audio: false
    })

    if (videoElement.value) {
      videoElement.value.srcObject = stream
      videoElement.value.onloadedmetadata = () => {
        cameraReady.value = true
        emit('ready')
      }
    }
  } catch (err) {
    console.error('Camera access error:', err)
    error.value = err.message || 'Unable to access camera'
    emit('error', error.value)
  }
}

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  cameraReady.value = false
  error.value = null
  if (videoElement.value) {
    videoElement.value.srcObject = null
  }
}

onMounted(() => {
  if (props.enabled) {
    startCamera()
  }
})

onBeforeUnmount(() => {
  stopCamera()
})

// Watch for enabled prop changes
watch(() => props.enabled, (newVal) => {
  if (newVal) {
    startCamera()
  } else {
    stopCamera()
  }
})

// Watch for lowResolution prop changes - restart camera with new resolution
watch(() => props.lowResolution, () => {
  if (props.enabled) {
    stopCamera()
    // Small delay to ensure camera is fully stopped before restarting
    setTimeout(() => {
      startCamera()
    }, 100)
  }
})

/**
 * Capture current video frame as base64 image
 * @param {Object} options - Capture options
 * @param {string} options.format - Image format: 'png' or 'jpeg' (default: 'png')
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.75, only for jpeg)
 * @returns {string} Base64 encoded image data URL
 */
const capturePhoto = (options = {}) => {
  if (!videoElement.value || !canvasElement.value) {
    throw new Error('Camera not ready')
  }

  const { format = 'png', quality = 0.75 } = options

  const video = videoElement.value
  const canvas = canvasElement.value

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // Draw current video frame to canvas
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Convert canvas to base64 with specified format
  if (format === 'jpeg') {
    return canvas.toDataURL('image/jpeg', quality)
  } else {
    return canvas.toDataURL('image/png')
  }
}

// Expose capturePhoto method to parent
defineExpose({
  capturePhoto
})
</script>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
