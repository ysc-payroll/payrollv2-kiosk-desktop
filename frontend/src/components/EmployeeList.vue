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
      <div class="flex gap-2">
        <button
          @click="showPopulateDummyDataConfirmation"
          :disabled="isPopulatingDummy || isLoading"
          class="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="h-5 w-5" :class="{ 'animate-spin': isPopulatingDummy }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          {{ isPopulatingDummy ? 'Populating...' : 'Populate Dummy Faces' }}
        </button>
        <button
          @click="showClearFaceDataConfirmation"
          :disabled="isClearingFaces || isLoading || !hasFaceRegistrations"
          class="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {{ isClearingFaces ? 'Clearing...' : 'Clear All Faces' }}
        </button>
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
                <th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Face ID
                </th>
                <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Actions
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
                <td class="px-6 py-4 text-center">
                  <!-- Face Registration Status -->
                  <span
                    v-if="employee.has_face_registration"
                    class="inline-flex items-center justify-center"
                    title="Face registered"
                  >
                    <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center justify-center"
                    title="No face registered"
                  >
                    <svg class="h-5 w-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="handleRegisterFace(employee)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                    :class="employee.has_face_registration
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-blue-700 bg-blue-50 hover:bg-blue-100'"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {{ employee.has_face_registration ? 'Update' : 'Register' }} Face
                  </button>
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

    <!-- Populate Dummy Face Data Confirmation Dialog -->
    <div
      v-if="showPopulateDummyDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closePopulateDummyDialog"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="p-6 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Populate Dummy Face Data</h2>
              <p class="text-sm text-slate-600">Performance Testing</p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="h-5 w-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-amber-900">Warning</p>
                <p class="text-xs text-amber-700 mt-1">
                  This will generate unique random face data for ALL {{ totalRecords }} employees.
                  <strong>Any existing face registrations will be overwritten.</strong>
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-900 font-medium mb-2">This feature is for:</p>
            <ul class="text-xs text-blue-800 space-y-1">
              <li>• Performance testing with large datasets</li>
              <li>• Testing face recognition speed at scale</li>
              <li>• Each employee will get a unique random face encoding</li>
            </ul>
          </div>

          <p class="text-sm text-slate-700">
            After populating, you can register your real face for one employee to test recognition performance.
          </p>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            @click="closePopulateDummyDialog"
            class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            @click="handlePopulateDummyData"
            class="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition"
          >
            Populate Dummy Data
          </button>
        </div>
      </div>
    </div>

    <!-- Clear All Face Data Confirmation Dialog -->
    <div
      v-if="showClearFaceDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeClearFaceDialog"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="p-6 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">Clear All Face Data</h2>
              <p class="text-sm text-slate-600">Permanent Action</p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="h-5 w-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-900">Permanent Deletion</p>
                <p class="text-xs text-red-700 mt-1">
                  This will permanently remove face registrations for ALL employees.
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
            </div>
          </div>

          <p class="text-sm text-slate-700">
            All employees will need to re-register their faces if you want to use face recognition again.
          </p>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            @click="closeClearFaceDialog"
            class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            @click="handleClearAllFaceData"
            class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
          >
            Clear All Face Data
          </button>
        </div>
      </div>
    </div>

    <!-- Face Registration Dialog -->
    <FaceRegistrationDialog
      :is-open="showFaceDialog"
      :employee="selectedEmployee"
      :has-existing="selectedEmployee?.has_face_registration || false"
      :registration-date="selectedEmployee?.face_registered_at || null"
      @close="closeFaceDialog"
      @success="handleFaceRegistrationSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiService from '../services/api.js'
import FaceRegistrationDialog from './employee/FaceRegistrationDialog.vue'

// State
const allEmployees = ref([])          // All employees from API
const filteredEmployees = ref([])     // After search filter
const searchQuery = ref('')
const currentPage = ref(1)
const isLoading = ref(false)
const isRefreshing = ref(false)
const isPopulatingDummy = ref(false)
const isClearingFaces = ref(false)
const limit = 20

// Dialog states
const showConfirmDialog = ref(false)
const showResultDialog = ref(false)
const showFaceDialog = ref(false)
const showPopulateDummyDialog = ref(false)
const showClearFaceDialog = ref(false)
const selectedEmployee = ref(null)
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
const hasFaceRegistrations = computed(() =>
  allEmployees.value.some(emp => emp.has_face_registration)
)

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * limit
  const end = start + limit
  return filteredEmployees.value.slice(start, end)
})

// Fetch all employees from API (called once)
const fetchEmployees = async () => {
  isLoading.value = true

  try {
    // Fetch employees from local database instead of API
    if (!window.kioskBridge || !window.kioskBridge.getAllEmployeesFromDatabase) {
      console.error('Bridge not available, cannot fetch employees')
      allEmployees.value = []
      filteredEmployees.value = []
      isLoading.value = false
      return
    }

    const resultJson = await window.kioskBridge.getAllEmployeesFromDatabase()
    const result = JSON.parse(resultJson)

    if (result.success) {
      allEmployees.value = result.data || []
      console.log(`📥 Loaded ${allEmployees.value.length} employees from local database`)

      // No need to merge face registration status - it's already included!
      applyFilters()
    } else {
      console.error('Failed to fetch employees from database:', result.error)
      allEmployees.value = []
      filteredEmployees.value = []
    }
  } catch (error) {
    console.error('Error fetching employees from database:', error)
    allEmployees.value = []
    filteredEmployees.value = []
  } finally {
    isLoading.value = false
  }
}

// Merge face registration status from local database
const mergeFaceRegistrationStatus = async () => {
  try {
    if (!window.kioskBridge) return

    const resultJson = await window.kioskBridge.getAllFaceRegistrationStatuses()
    const result = JSON.parse(resultJson)

    if (result.success && result.data) {
      // Create a map for quick lookup
      const faceStatusMap = new Map()
      result.data.forEach(status => {
        faceStatusMap.set(status.employee_number, {
          has_face_registration: status.has_face_registration,
          face_registered_at: status.face_registered_at
        })
      })

      // Merge with employee data
      allEmployees.value.forEach(emp => {
        const faceStatus = faceStatusMap.get(emp.timekeeper_id)
        if (faceStatus) {
          emp.has_face_registration = faceStatus.has_face_registration
          emp.face_registered_at = faceStatus.face_registered_at
        } else {
          emp.has_face_registration = false
          emp.face_registered_at = null
        }
      })
    }
  } catch (error) {
    console.error('Error merging face registration status:', error)
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
    }
  } catch (error) {
    console.error('Error syncing employees:', error)
  } finally {
    isRefreshing.value = false
  }
}

// Face registration handlers
const handleRegisterFace = async (employee) => {
  // First, we need to get the local database ID
  // The employee object from API has 'id' which is the backend_id
  // We need to query the bridge to get the local database employee ID

  try {
    // Query the bridge to get full employee info including local database ID
    const resultJson = await window.kioskBridge.getEmployeeByNumber(employee.timekeeper_id)
    const result = JSON.parse(resultJson)

    if (result.success && result.employee) {
      // Get face registration status
      const statusJson = await window.kioskBridge.getFaceRegistrationStatus(result.employee.id)
      const statusResult = JSON.parse(statusJson)

      // Create employee object with all needed data
      selectedEmployee.value = {
        id: result.employee.id,  // Local database ID
        backend_id: result.employee.backend_id,
        name: result.employee.name,
        employee_number: result.employee.employee_number,
        has_face_registration: statusResult.has_registration || false,
        face_registered_at: statusResult.registered_at || null
      }

      showFaceDialog.value = true
    } else {
      alert('Employee not found in local database. Please sync employees first.')
    }
  } catch (error) {
    console.error('Error opening face registration:', error)
  }
}

const closeFaceDialog = () => {
  showFaceDialog.value = false
  selectedEmployee.value = null
}

const handleFaceRegistrationSuccess = async () => {
  // Reload employees to update face registration status
  await fetchEmployees()

  // Also update the selected employee's status in the list
  if (selectedEmployee.value) {
    const empIndex = allEmployees.value.findIndex(
      e => e.timekeeper_id === selectedEmployee.value.employee_number
    )

    if (empIndex !== -1) {
      allEmployees.value[empIndex].has_face_registration = true
      allEmployees.value[empIndex].face_registered_at = new Date().toISOString()
      applyFilters()
    }
  }
}

// Populate Dummy Face Data handlers
const showPopulateDummyDataConfirmation = () => {
  showPopulateDummyDialog.value = true
}

const closePopulateDummyDialog = () => {
  showPopulateDummyDialog.value = false
}

const handlePopulateDummyData = () => {
  isPopulatingDummy.value = true
  closePopulateDummyDialog()

  try {
    // Set up signal listener for when operation completes
    // This runs in a background thread, so UI stays responsive
    if (window.kioskBridge.populateFaceDataComplete) {
      // Remove any existing listener first
      window.kioskBridge.populateFaceDataComplete.disconnect?.(handlePopulateComplete)
      // Connect new listener
      window.kioskBridge.populateFaceDataComplete.connect(handlePopulateComplete)
    }

    // Start the background operation (non-blocking)
    window.kioskBridge.populateDummyFaceData()

    console.log('🔄 Populating dummy face data in background...')
    window.showToast?.('Populating face data in background...', 'info')
  } catch (error) {
    console.error('Error starting populate operation:', error)
    window.showToast?.('Error starting populate operation', 'error')
    isPopulatingDummy.value = false
  }
}

// Handler for when background populate operation completes
const handlePopulateComplete = async (resultJson) => {
  try {
    const result = JSON.parse(resultJson)

    if (result.success) {
      console.log(`✅ Populated dummy face data: ${result.count} employees in ${result.duration}s`)

      // Show success toast
      window.showToast?.(
        `Successfully populated dummy face data for ${result.count} employees in ${result.duration}s`,
        'success'
      )

      // Reload employees to show updated face registration status
      await fetchEmployees()
    } else {
      console.error('Failed to populate dummy face data:', result.message)
      window.showToast?.(result.message || 'Failed to populate dummy face data', 'error')
    }
  } catch (error) {
    console.error('Error processing populate result:', error)
    window.showToast?.('Error processing populate result', 'error')
  } finally {
    isPopulatingDummy.value = false
  }
}

// Clear All Face Data handlers
const showClearFaceDataConfirmation = () => {
  showClearFaceDialog.value = true
}

const closeClearFaceDialog = () => {
  showClearFaceDialog.value = false
}

const handleClearAllFaceData = () => {
  isClearingFaces.value = true
  closeClearFaceDialog()

  try {
    // Set up signal listener for when operation completes
    // This runs in a background thread, so UI stays responsive
    if (window.kioskBridge.clearFaceDataComplete) {
      // Remove any existing listener first
      window.kioskBridge.clearFaceDataComplete.disconnect?.(handleClearComplete)
      // Connect new listener
      window.kioskBridge.clearFaceDataComplete.connect(handleClearComplete)
    }

    // Start the background operation (non-blocking)
    window.kioskBridge.clearAllFaceData()

    console.log('🔄 Clearing face data in background...')
    window.showToast?.('Clearing face data in background...', 'info')
  } catch (error) {
    console.error('Error starting clear operation:', error)
    window.showToast?.('Error starting clear operation', 'error')
    isClearingFaces.value = false
  }
}

// Handler for when background clear operation completes
const handleClearComplete = async (resultJson) => {
  try {
    const result = JSON.parse(resultJson)

    if (result.success) {
      console.log(`✅ Cleared face data: ${result.count} employees in ${result.duration}s`)

      // Show success toast
      window.showToast?.(
        `Successfully cleared face data for ${result.count} employees in ${result.duration}s`,
        'success'
      )

      // Reload employees to show updated face registration status
      await fetchEmployees()
    } else {
      console.error('Failed to clear face data:', result.message)
      window.showToast?.(result.message || 'Failed to clear face data', 'error')
    }
  } catch (error) {
    console.error('Error processing clear result:', error)
    window.showToast?.('Error processing clear result', 'error')
  } finally {
    isClearingFaces.value = false
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
