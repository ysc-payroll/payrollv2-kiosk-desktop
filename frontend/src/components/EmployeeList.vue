<template>
  <div class="employee-list-view h-full overflow-y-auto p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Employee List</h1>
        <p class="text-sm text-slate-600 mt-1">
          {{ totalRecords }} employee{{ totalRecords !== 1 ? 's' : '' }} total
        </p>
      </div>
      <button
        @click="showRefreshConfirmation"
        :disabled="isRefreshing || isLoading"
        class="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg class="h-5 w-5" :class="{ 'animate-spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ isRefreshing ? 'Refreshing...' : 'Refresh from Live' }}
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

    <!-- Confirmation Dialog -->
    <div
      v-if="showConfirmDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeConfirmDialog"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="p-6 border-b border-slate-200">
          <h2 class="text-xl font-bold text-slate-900">Confirm Sync</h2>
        </div>

        <!-- Body -->
        <div class="p-6">
          <p class="text-slate-700">
            This will sync employees from the live system and mark removed employees as inactive.
          </p>
          <p class="text-slate-600 text-sm mt-3">
            Employees with existing applications will not be removed.
          </p>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            @click="closeConfirmDialog"
            class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            @click="handleRefreshFromLive"
            class="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>

    <!-- Sync Result Dialog -->
    <div
      v-if="showResultDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeResultDialog"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 class="text-xl font-bold text-slate-900">Sync Results</h2>
          <button
            @click="closeResultDialog"
            class="text-slate-400 hover:text-slate-600 transition"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span class="text-sm font-medium text-slate-700">Added</span>
              <span class="text-lg font-bold text-green-600">{{ syncResult.added_count }}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span class="text-sm font-medium text-slate-700">Updated</span>
              <span class="text-lg font-bold text-blue-600">{{ syncResult.updated_count }}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span class="text-sm font-medium text-slate-700">Removed</span>
              <span class="text-lg font-bold text-red-600">{{ syncResult.deleted_count }}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-slate-200 flex justify-end">
          <button
            @click="closeResultDialog"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiService from '../services/api.js'

// State
const allEmployees = ref([])          // All employees from API
const filteredEmployees = ref([])     // After search filter
const searchQuery = ref('')
const currentPage = ref(1)
const isLoading = ref(false)
const isRefreshing = ref(false)
const limit = 20

// Dialog states
const showConfirmDialog = ref(false)
const showResultDialog = ref(false)
const syncResult = ref({
  added_count: 0,
  updated_count: 0,
  deleted_count: 0,
  skipped_count: 0,
  skipped_details: []
})

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

// Refresh from Live handlers
const showRefreshConfirmation = () => {
  showConfirmDialog.value = true
}

const closeConfirmDialog = () => {
  showConfirmDialog.value = false
}

const closeResultDialog = () => {
  showResultDialog.value = false
}

const handleRefreshFromLive = async () => {
  // Close confirmation dialog
  closeConfirmDialog()

  // Start refreshing
  isRefreshing.value = true

  try {
    const result = await apiService.syncEmployeesWithCleanup()

    if (result.success) {
      // Store sync results
      syncResult.value = result.data

      // Reload employee list
      await fetchEmployees()

      // Show result dialog
      showResultDialog.value = true
    } else {
      console.error('Failed to sync employees:', result.message)
      alert(`Sync failed: ${result.message}`)
    }
  } catch (error) {
    console.error('Error syncing employees:', error)
    alert(`Sync error: ${error.message}`)
  } finally {
    isRefreshing.value = false
  }
}

// Load employees on mount
onMounted(() => {
  fetchEmployees()
})
</script>

<style scoped>
.employee-list-view {
  background: linear-gradient(to bottom right,
    rgb(240 249 255),
    rgb(224 231 255),
    rgb(250 232 255)
  );
}

/* Custom scrollbar for view */
.employee-list-view::-webkit-scrollbar {
  width: 8px;
}

.employee-list-view::-webkit-scrollbar-track {
  background: transparent;
}

.employee-list-view::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.employee-list-view::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

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
