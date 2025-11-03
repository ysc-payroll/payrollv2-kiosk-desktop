<template>
  <div class="camera-container">
    <video
      ref="videoElement"
      autoplay
      playsinline
      class="w-full h-full object-cover bg-gray-900"
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

    <div v-if="!cameraReady && !error" class="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p>Initializing camera...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const videoElement = ref(null)
const canvasElement = ref(null)
const cameraReady = ref(false)
const error = ref(null)
let stream = null

const emit = defineEmits(['ready', 'error'])

onMounted(async () => {
  try {
    // Request camera access
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
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
})

onBeforeUnmount(() => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
})

/**
 * Capture current video frame as base64 image
 * @returns {string} Base64 encoded image data URL
 */
const capturePhoto = () => {
  if (!videoElement.value || !canvasElement.value) {
    throw new Error('Camera not ready')
  }

  const video = videoElement.value
  const canvas = canvasElement.value

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // Draw current video frame to canvas
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Convert canvas to base64 PNG
  return canvas.toDataURL('image/png')
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
