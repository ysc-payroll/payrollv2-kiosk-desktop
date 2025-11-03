<template>
  <div class="keypad grid grid-cols-3 gap-2">
    <button
      v-for="num in numbers"
      :key="num"
      @click="handleClick(num)"
      class="keypad-button bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xl rounded-lg transition-colors duration-150 h-12"
    >
      {{ num }}
    </button>

    <button
      @click="handleBackspace"
      class="keypad-button bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold text-base rounded-lg transition-colors duration-150 h-12"
    >
      ←
    </button>

    <button
      @click="handleClick('0')"
      class="keypad-button bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xl rounded-lg transition-colors duration-150 h-12"
    >
      0
    </button>

    <button
      @click="handleClear"
      class="keypad-button bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-base rounded-lg transition-colors duration-150 h-12"
    >
      CLR
    </button>
  </div>
</template>

<script setup>
const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const emit = defineEmits(['digit-click', 'backspace', 'clear'])

const handleClick = (digit) => {
  emit('digit-click', digit)
}

const handleBackspace = () => {
  emit('backspace')
}

const handleClear = () => {
  emit('clear')
}
</script>

<style scoped>
.keypad-button {
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.keypad-button:active {
  transform: scale(0.95);
}
</style>
