<template>
  <div class="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Employee List</h1>
          <p class="text-sm text-slate-600 mt-1">
            {{ totalRecords }} employee{{ totalRecords !== 1 ? 's' : '' }} total
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="inline-flex items-center gap-2 rounded-xl bg-slate-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>

      <!-- Search Section -->
      <div class="relative isolate overflow-hidden rounded-2xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur p-6 mb-6">
        <div class="flex gap-4">
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by Employee Number or Name..."
              class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              @keypress.enter="performSearch"
            />
          </div>
          <button
            @click="performSearch"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>
          <button
            v-if="searchQuery"
            @click="clearSearch"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 rounded-xl bg-slate-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-600 focus:outline-none focus:ring-4 focus:ring-slate-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Employee Table -->
      <div class="relative isolate overflow-hidden rounded-2xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-12 text-center">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p class="mt-4 text-sm text-slate-600">Loading employees...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="paginatedEmployees.length === 0" class="p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-slate-900">No employees found</h3>
          <p class="mt-2 text-sm text-slate-600">
            {{ searchQuery ? 'Try a different search term' : 'No employees available' }}
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Employee Number
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Full Name
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="employee in paginatedEmployees"
                :key="employee.id"
                class="transition hover:bg-slate-50/50"
              >
                <td class="px-6 py-4 text-sm text-slate-900">
                  {{ employee.timekeeper_id || '-' }}
                </td>
                <td class="px-6 py-4 text-sm font-medium text-slate-900">
                  {{ employee.name || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="paginatedEmployees.length > 0" class="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-slate-600">
              Showing {{ startRecord }} to {{ endRecord }} of {{ totalRecords }} employees
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div class="flex items-center gap-1">
                <span class="px-4 py-2 text-sm font-medium text-slate-900">
                  Page {{ currentPage }} of {{ totalPages }}
                </span>
              </div>

              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiService from '../services/api.js'

// Emits
const emit = defineEmits(['close'])

// State
const allEmployees = ref([])          // All employees from API
const filteredEmployees = ref([])     // After search filter
const searchQuery = ref('')
const currentPage = ref(1)
const isLoading = ref(false)
const limit = 20

// Computed properties
const totalRecords = computed(() => filteredEmployees.value.length)
const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / limit) || 1)
const startRecord = computed(() => (currentPage.value - 1) * limit + 1)
const endRecord = computed(() => Math.min(currentPage.value * limit, totalRecords.value))

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * limit
  const end = start + limit
  return filteredEmployees.value.slice(start, end)
})

// Fetch all employees from API (called once)
const fetchEmployees = async () => {
  isLoading.value = true

  try {
    const result = await apiService.getEmployeesTimekeeper()

    if (result.success) {
      allEmployees.value = result.data || []
      applyFilters()
    } else {
      console.error('Failed to fetch employees:', result.message)
      allEmployees.value = []
      filteredEmployees.value = []
    }
  } catch (error) {
    console.error('Error fetching employees:', error)
    allEmployees.value = []
    filteredEmployees.value = []
  } finally {
    isLoading.value = false
  }
}

// Apply search filter to all employees
const applyFilters = () => {
  if (searchQuery.value && searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()

    filteredEmployees.value = allEmployees.value.filter(emp => {
      const name = (emp.name || '').toLowerCase()
      const timekeeperId = (emp.timekeeper_id || '').toString()

      return name.includes(query) || timekeeperId.includes(query)
    })
  } else {
    filteredEmployees.value = allEmployees.value
  }

  // Reset to page 1 when filters change
  currentPage.value = 1
}

// Search handler
const performSearch = () => {
  applyFilters()
}

// Clear search
const clearSearch = () => {
  searchQuery.value = ''
  applyFilters()
}

// Pagination handlers
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// Load employees on mount
onMounted(() => {
  fetchEmployees()
})
</script>

<style scoped>
/* Custom scrollbar for table */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
