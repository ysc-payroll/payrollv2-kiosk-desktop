<template>
  <div class="keypad grid grid-cols-3 gap-2">
    <button
      v-for="num in numbers"
      :key="num"
      @click="handleClick(num)"
      class="keypad-button text-white font-bold text-xl rounded-lg transition-colors duration-150 h-12"
      style="background-color: #3073F1;"
      @mouseover="handleKeypadHover($event, 'number', true)"
      @mouseout="handleKeypadHover($event, 'number', false)"
    >
      {{ num }}
    </button>

    <button
      @click="handleBackspace"
      class="keypad-button text-white font-bold text-base rounded-lg transition-colors duration-150 h-12"
      style="background-color: #68625D;"
      @mouseover="handleKeypadHover($event, 'backspace', true)"
      @mouseout="handleKeypadHover($event, 'backspace', false)"
    >
      ←
    </button>

    <button
      @click="handleClick('0')"
      class="keypad-button text-white font-bold text-xl rounded-lg transition-colors duration-150 h-12"
      style="background-color: #3073F1;"
      @mouseover="handleKeypadHover($event, 'number', true)"
      @mouseout="handleKeypadHover($event, 'number', false)"
    >
      0
    </button>

    <button
      @click="handleClear"
      class="keypad-button text-white font-bold text-base rounded-lg transition-colors duration-150 h-12"
      style="background-color: #E63535;"
      @mouseover="handleKeypadHover($event, 'clear', true)"
      @mouseout="handleKeypadHover($event, 'clear', false)"
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

// Hover handlers
const keypadColors = {
  number: { normal: '#3073F1', hover: '#2563D0' },
  backspace: { normal: '#68625D', hover: '#554F4B' },
  clear: { normal: '#E63535', hover: '#CC2E2E' }
}

const handleKeypadHover = (event, colorKey, isHover) => {
  const colors = keypadColors[colorKey]
  event.currentTarget.style.backgroundColor = isHover ? colors.hover : colors.normal
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
