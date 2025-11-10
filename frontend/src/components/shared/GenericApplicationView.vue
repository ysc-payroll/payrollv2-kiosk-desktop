<template>
  <div :class="config.cssClass" class="h-full overflow-y-auto">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ config.title }}</h1>
          <p class="text-xs text-slate-600 mt-0.5">
            {{ totalRecords }} {{ config.applicationLabel }}{{ totalRecords !== 1 ? 's' : '' }} total
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

      <!-- Application Table -->
      <div class="relative isolate overflow-hidden rounded-xl bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <!-- Empty State -->
        <div v-if="!isLoading && applications.length === 0" class="p-8 text-center">
          <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="config.emptyStateIcon" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-slate-900">{{ config.emptyStateTitle }}</h3>
          <p class="mt-2 text-sm text-slate-600">
            {{ hasActiveFilters ? 'Try adjusting your filters' : config.emptyStateMessage }}
          </p>
        </div>

        <!-- Table with horizontal scroll -->
        <div v-else class="overflow-x-auto">
          <slot name="table" :records="applications" :isLoading="isLoading" :permissions="permissions" :handleEdit="handleEdit" />
        </div>

        <!-- Pagination -->
        <div v-if="applications.length > 0" class="border-t border-slate-200 bg-slate-50/50 px-3 py-2">
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
    <slot
      name="dialog"
      :isModalOpen="isModalOpen"
      :modalMode="modalMode"
      :selectedRecord="selectedRecord"
      :employees="employees"
      :permissions="permissions"
      :isSaving="isSaving"
      :closeModal="closeModal"
      :handleSubmit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  composable: {
    type: Object,
    required: true
  }
})

// Destructure composable
const {
  applications,
  employees,
  isLoading,
  isSaving,
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
  fetchApplications,
  fetchEmployees,
  applyFilters,
  prevPage,
  nextPage,
  createApplication,
  updateApplication,
  getApplicationById
} = props.composable

// Modal state
const isModalOpen = ref(false)
const modalMode = ref('create')
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
  const result = await getApplicationById(record.id)
  if (result.success) {
    if (permissions.value.canSelectEmployee) {
      fetchEmployees()
    }
    selectedRecord.value = result.data
    modalMode.value = 'edit'
    isModalOpen.value = true
  }
  // Error is already handled by errorHandler in composable
}

// Handle form submission
const handleSubmit = async (payload) => {
  let result

  if (payload.mode === 'create') {
    result = await createApplication(payload.data)
  } else if (payload.mode === 'edit') {
    result = await updateApplication(selectedRecord.value.id, payload.data)
  }

  if (result.success) {
    closeModal()
  }
  // Success/error messages are handled by errorHandler in composable
}

// Lifecycle
onMounted(() => {
  loadPermissions()
  if (permissions.value.canRead) {
    fetchApplications()
  }
})
</script>

<style scoped>
.overtime-view,
.holiday-view,
.restday-view,
.undertime-view,
.leave-view {
  background: linear-gradient(to bottom right,
    rgb(240 249 255),
    rgb(224 231 255),
    rgb(250 232 255)
  );
}

/* Custom scrollbar */
.overtime-view::-webkit-scrollbar,
.holiday-view::-webkit-scrollbar,
.restday-view::-webkit-scrollbar,
.undertime-view::-webkit-scrollbar,
.leave-view::-webkit-scrollbar {
  width: 8px;
}

.overtime-view::-webkit-scrollbar-track,
.holiday-view::-webkit-scrollbar-track,
.restday-view::-webkit-scrollbar-track,
.undertime-view::-webkit-scrollbar-track,
.leave-view::-webkit-scrollbar-track {
  background: transparent;
}

.overtime-view::-webkit-scrollbar-thumb,
.holiday-view::-webkit-scrollbar-thumb,
.restday-view::-webkit-scrollbar-thumb,
.undertime-view::-webkit-scrollbar-thumb,
.leave-view::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.overtime-view::-webkit-scrollbar-thumb:hover,
.holiday-view::-webkit-scrollbar-thumb:hover,
.restday-view::-webkit-scrollbar-thumb:hover,
.undertime-view::-webkit-scrollbar-thumb:hover,
.leave-view::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
