<template>
  <Transition name="toast">
    <div
      v-if="visible"
      :class="[
        'toast fixed top-8 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-lg shadow-lg text-white font-semibold text-xl min-w-80 text-center',
        toastClass
      ]"
    >
      <div class="flex items-center justify-center gap-3">
        <svg v-if="type === 'success'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else-if="type === 'error'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  },
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)
let timeout = null

const toastClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'toast-success'
    case 'error':
      return 'toast-error'
    default:
      return 'toast-info'
  }
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    visible.value = true

    // Clear existing timeout
    if (timeout) clearTimeout(timeout)

    // Auto-hide after duration
    timeout = setTimeout(() => {
      visible.value = false
      emit('close')
    }, props.duration)
  } else {
    visible.value = false
  }
})
</script>

<style scoped>
.toast-success {
  background-color: #1CB454;
}

.toast-error {
  background-color: #E63535;
}

.toast-info {
  background-color: #0895D8;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
