<template>
  <div class="relative" ref="container">
    <!-- Selected Value Display -->
    <button
      type="button"
      @click="toggleDropdown"
      class="block w-full rounded-xl border bg-white px-4 py-3 text-sm text-left shadow-sm outline-none transition"
      :class="[
        isOpen ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-200',
        error ? 'border-red-300' : '',
        'hover:border-slate-300'
      ]"
    >
      <div class="flex items-center justify-between">
        <span :class="selectedLabel ? 'text-slate-900' : 'text-slate-400'">
          {{ selectedLabel || placeholder }}
        </span>
        <svg
          class="h-5 w-5 text-slate-400 transition-transform"
          :class="{ 'rotate-180': isOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <!-- Search Input -->
        <div class="p-3 border-b border-slate-100">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              @keydown.down.prevent="navigateDown"
              @keydown.up.prevent="navigateUp"
              @keydown.enter.prevent="selectHighlighted"
              @keydown.esc="closeDropdown"
            />
          </div>
        </div>

        <!-- Options List with Virtual Scrolling -->
        <div
          ref="optionsList"
          class="max-h-64 overflow-y-auto"
          @scroll="handleScroll"
        >
          <div v-if="filteredOptions.length === 0" class="px-4 py-8 text-center text-sm text-slate-500">
            No results found
          </div>

          <button
            v-for="(option, index) in visibleOptions"
            :key="option[valueKey]"
            type="button"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = firstVisibleIndex + index"
            class="w-full px-4 py-2.5 text-left text-sm transition"
            :class="[
              modelValue === option[valueKey] ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700',
              highlightedIndex === firstVisibleIndex + index ? 'bg-slate-100' : 'hover:bg-slate-50'
            ]"
          >
            {{ option[labelKey] }}
          </button>

          <!-- Loading Indicator -->
          <div v-if="isLoadingMore" class="px-4 py-3 text-center">
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        </div>

        <!-- Results Counter -->
        <div v-if="filteredOptions.length > 0" class="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
          Showing {{ visibleOptions.length }} of {{ filteredOptions.length }} results
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    required: true
  },
  labelKey: {
    type: String,
    default: 'label'
  },
  valueKey: {
    type: String,
    default: 'value'
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  },
  error: {
    type: Boolean,
    default: false
  },
  initialLimit: {
    type: Number,
    default: 50
  }
})

const emit = defineEmits(['update:modelValue'])

const container = ref(null)
const searchInput = ref(null)
const optionsList = ref(null)
const isOpen = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(0)
const firstVisibleIndex = ref(0)
const visibleCount = ref(props.initialLimit)
const isLoadingMore = ref(false)

// Computed: Selected label
const selectedLabel = computed(() => {
  const selected = props.options.find(opt => opt[props.valueKey] === props.modelValue)
  return selected ? selected[props.labelKey] : ''
})

// Computed: Filtered options based on search
const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return props.options
  }

  const query = searchQuery.value.toLowerCase()
  return props.options.filter(option =>
    option[props.labelKey].toLowerCase().includes(query)
  )
})

// Computed: Visible options (for virtual scrolling)
const visibleOptions = computed(() => {
  return filteredOptions.value.slice(firstVisibleIndex.value, firstVisibleIndex.value + visibleCount.value)
})

// Toggle dropdown
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
}

// Close dropdown
const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
  highlightedIndex.value = 0
  firstVisibleIndex.value = 0
  visibleCount.value = props.initialLimit
}

// Select option
const selectOption = (option) => {
  emit('update:modelValue', option[props.valueKey])
  closeDropdown()
}

// Select highlighted option
const selectHighlighted = () => {
  if (filteredOptions.value.length > 0 && highlightedIndex.value >= 0) {
    selectOption(filteredOptions.value[highlightedIndex.value])
  }
}

// Keyboard navigation
const navigateDown = () => {
  if (highlightedIndex.value < filteredOptions.value.length - 1) {
    highlightedIndex.value++
    scrollToHighlighted()
  }
}

const navigateUp = () => {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
    scrollToHighlighted()
  }
}

// Scroll to highlighted item
const scrollToHighlighted = () => {
  if (!optionsList.value) return

  const itemHeight = 40 // Approximate height of each option
  const scrollTop = optionsList.value.scrollTop
  const containerHeight = optionsList.value.clientHeight
  const highlightedTop = highlightedIndex.value * itemHeight
  const highlightedBottom = highlightedTop + itemHeight

  if (highlightedTop < scrollTop) {
    optionsList.value.scrollTop = highlightedTop
  } else if (highlightedBottom > scrollTop + containerHeight) {
    optionsList.value.scrollTop = highlightedBottom - containerHeight
  }
}

// Handle scroll for virtual scrolling
const handleScroll = () => {
  if (!optionsList.value) return

  const { scrollTop, scrollHeight, clientHeight } = optionsList.value

  // Calculate first visible index based on scroll position
  const itemHeight = 40
  firstVisibleIndex.value = Math.floor(scrollTop / itemHeight)

  // Load more when near bottom
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadMore()
  }
}

// Load more items
const loadMore = () => {
  if (visibleCount.value >= filteredOptions.value.length) return
  if (isLoadingMore.value) return

  isLoadingMore.value = true
  setTimeout(() => {
    visibleCount.value = Math.min(visibleCount.value + 50, filteredOptions.value.length)
    isLoadingMore.value = false
  }, 100)
}

// Click outside to close
const handleClickOutside = (event) => {
  if (container.value && !container.value.contains(event.target)) {
    closeDropdown()
  }
}

// Watch search query to reset visible items
watch(searchQuery, () => {
  highlightedIndex.value = 0
  firstVisibleIndex.value = 0
  visibleCount.value = props.initialLimit
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Custom scrollbar */
.max-h-64::-webkit-scrollbar {
  width: 6px;
}

.max-h-64::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.max-h-64::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.max-h-64::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
