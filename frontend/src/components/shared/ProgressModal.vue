<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div class="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6">
      <!-- Icon -->
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h3 class="text-xl font-bold text-center text-slate-900 mb-2">
        {{ title }}
      </h3>

      <!-- Progress Text -->
      <p class="text-center text-slate-600 mb-6">
        Processing {{ processed }} / {{ total }} employees ({{ percent }}%)
      </p>

      <!-- Progress Bar -->
      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
          :style="{ width: percent + '%' }"
        ></div>
      </div>

      <!-- Status Message (optional) -->
      <p v-if="message" class="text-sm text-center text-slate-500 mt-4">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: 'Processing'
  },
  processed: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  percent: {
    type: Number,
    default: 0
  },
  message: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
