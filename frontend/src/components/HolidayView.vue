<template>
  <div class="holiday-view h-full overflow-y-auto">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Holiday Work Management</h1>
          <p class="text-xs text-slate-600 mt-0.5">
            {{ totalRecords }} holiday application{{ totalRecords !== 1 ? 's' : '' }} total
            <span v-if="pendingCount > 0" class="ml-2 text-amber-600 font-medium">
              ({{ pendingCount }} pending)
            </span>
          </p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="permissions.canCreate"
            @click="openModal('create')"
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </button>
          <button
            v-if="permissions.canRead"
            @click="handleExport"
            :disabled="isExporting"
            class="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ isExporting ? 'Exporting...' : 'Export' }}
          </button>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="relative isolate overflow-hidden rounded-xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur p-3 mb-3">
        <!-- Row 1: Date Range + Search + Apply Button -->
        <div class="flex flex-col md:flex-row md:items-end gap-2 mb-2">
          <!-- Left side: Date Range and Search -->
          <div class="flex flex-col md:flex-row gap-2 flex-1">
            <!-- Date From -->
            <div class="flex-1">
              <label class="block text-xs font-medium text-slate-700 mb-1">Date From</label>
              <input
                v-model="filters.application_date_from"
                type="date"
                @change="applyFilters"
                class="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Date To -->
            <div class="flex-1">
              <label class="block text-xs font-medium text-slate-700 mb-1">Date To</label>
              <input
                v-model="filters.application_date_to"
                type="date"
                @change="applyFilters"
                class="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Search Employee -->
            <div class="flex-1">
              <label class="block text-xs font-medium text-slate-700 mb-1">Search Employee</label>
              <input
                v-model="filters.search"
                type="text"
                placeholder="Search by name..."
                @keypress.enter="applyFilters"
                class="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <!-- Right side: Apply Button -->
          <div class="flex-shrink-0">
            <button
              @click="applyFilters"
              :disabled="isLoading"
              class="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Apply
            </button>
          </div>
        </div>

        <!-- Row 2: Status Filter -->
        <div class="w-full md:w-48">
          <label class="block text-xs font-medium text-slate-700 mb-1">Status</label>
          <select
            v-model="filters.status"
            @change="applyFilters"
            class="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disapproved">Disapproved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Holiday Table -->
      <div class="relative isolate overflow-hidden rounded-xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <!-- Empty State -->
        <div v-if="!isLoading && holidayApplications.length === 0" class="p-8 text-center">
          <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-slate-900">No holiday applications found</h3>
          <p class="mt-2 text-sm text-slate-600">
            {{ hasActiveFilters ? 'Try adjusting your filters' : 'No holiday applications have been submitted yet' }}
          </p>
        </div>

        <!-- Table with horizontal scroll -->
        <div v-else class="overflow-x-auto">
          <HolidayTable
            :records="holidayApplications"
            :is-loading="isLoading"
            :permissions="permissions"
            @edit="handleEdit"
          />
        </div>

        <!-- Pagination -->
        <div v-if="holidayApplications.length > 0" class="border-t border-slate-200 bg-slate-50/50 px-3 py-2">
          <div class="flex items-center justify-between">
            <div class="text-xs text-slate-600">
              Showing {{ startRecord }} to {{ endRecord }} of {{ totalRecords }} applications
            </div>
            <div class="flex items-center gap-1.5">
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div class="flex items-center gap-0.5">
                <span class="px-2.5 py-1 text-xs font-medium text-slate-900">
                  Page {{ currentPage }} of {{ totalPages }}
                </span>
              </div>

              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Dialog Modal -->
    <HolidayFormDialog
      :is-open="isModalOpen"
      :mode="modalMode"
      :selected-record="selectedRecord"
      :employees="employees"
      :can-select-employee="permissions.canSelectEmployee"
      :is-saving="isSaving"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useHolidayManagement } from '../composables/useHolidayManagement'
import HolidayTable from './holiday/HolidayTable.vue'
import HolidayFormDialog from './holiday/HolidayFormDialog.vue'

// Use composable
const {
  holidayApplications,
  employees,
  isLoading,
  isSaving,
  isExporting,
  currentPage,
  totalRecords,
  totalPages,
  filters,
  permissions,
  hasActiveFilters,
  pendingCount,
  startRecord,
  endRecord,
  loadPermissions,
  fetchHolidayApplications,
  fetchEmployees,
  applyFilters,
  clearFilters,
  prevPage,
  nextPage,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  cancelHoliday,
  getHolidayById,
  exportToCSV
} = useHolidayManagement()

// Modal state
const isModalOpen = ref(false)
const modalMode = ref('create') // 'create', 'edit', 'view', 'cancel', 'delete'
const selectedRecord = ref(null)

// Open modal
const openModal = (mode, record = null) => {
  modalMode.value = mode
  selectedRecord.value = record
  isModalOpen.value = true

  if (mode === 'create' && permissions.value.canSelectEmployee) {
    fetchEmployees()
  }
}

// Close modal
const closeModal = () => {
  isModalOpen.value = false
  selectedRecord.value = null
}

// Handle actions from table
const handleEdit = async (record) => {
  const result = await getHolidayById(record.id)
  if (result.success) {
    if (permissions.value.canSelectEmployee) {
      fetchEmployees()
    }
    selectedRecord.value = result.data
    modalMode.value = 'edit'
    isModalOpen.value = true
  }
}

// Handle form submission
const handleSubmit = async (payload) => {
  let result

  if (payload.mode === 'create') {
    result = await createHoliday(payload.data)
  } else if (payload.mode === 'edit') {
    result = await updateHoliday(selectedRecord.value.id, payload.data)
  }

  if (result.success) {
    closeModal()
    console.log(result.message)
  } else {
    console.error(result.message)
  }
}

// Handle export
const handleExport = async () => {
  const result = await exportToCSV()
  if (result.success) {
    console.log(result.message)
  } else {
    console.error(result.message)
  }
}

// Lifecycle
onMounted(() => {
  loadPermissions()
  if (permissions.value.canRead) {
    fetchHolidayApplications()
  }
})
</script>

<style scoped>
.holiday-view {
  background: linear-gradient(to bottom right,
    rgb(240 249 255),
    rgb(224 231 255),
    rgb(250 232 255)
  );
}

/* Custom scrollbar */
.holiday-view::-webkit-scrollbar {
  width: 8px;
}

.holiday-view::-webkit-scrollbar-track {
  background: transparent;
}

.holiday-view::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.holiday-view::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
