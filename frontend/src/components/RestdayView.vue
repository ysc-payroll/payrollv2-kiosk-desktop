<template>
  <GenericApplicationView :config="restdayViewConfig" :composable="composableData">
    <!-- Table slot -->
    <template #table="{ records, isLoading, permissions, handleEdit }">
      <RestdayTable
        :records="records"
        :is-loading="isLoading"
        :permissions="permissions"
        @edit="handleEdit"
      />
    </template>

    <!-- Dialog slot -->
    <template #dialog="{ isModalOpen, modalMode, selectedRecord, employees, permissions, isSaving, closeModal, handleSubmit }">
      <RestdayFormDialog
        :is-open="isModalOpen"
        :mode="modalMode"
        :selected-record="selectedRecord"
        :employees="employees"
        :can-select-employee="permissions.canSelectEmployee"
        :is-saving="isSaving"
        @close="closeModal"
        @submit="handleSubmit"
      />
    </template>
  </GenericApplicationView>
</template>

<script setup>
import { useRestdayManagement } from '../composables/useRestdayManagement'
import GenericApplicationView from './shared/GenericApplicationView.vue'
import RestdayTable from './restday/RestdayTable.vue'
import RestdayFormDialog from './restday/RestdayFormDialog.vue'
import { restdayViewConfig } from '../configs/viewConfigs.js'

// Get composable data and map to generic names
const composable = useRestdayManagement()

const composableData = {
  applications: composable.restdayApplications,
  employees: composable.employees,
  isLoading: composable.isLoading,
  isSaving: composable.isSaving,
  isExporting: composable.isExporting,
  currentPage: composable.currentPage,
  totalRecords: composable.totalRecords,
  totalPages: composable.totalPages,
  filters: composable.filters,
  permissions: composable.permissions,
  hasActiveFilters: composable.hasActiveFilters,
  pendingCount: composable.pendingCount,
  startRecord: composable.startRecord,
  endRecord: composable.endRecord,
  loadPermissions: composable.loadPermissions,
  fetchApplications: composable.fetchRestdayApplications,
  fetchEmployees: composable.fetchEmployees,
  applyFilters: composable.applyFilters,
  prevPage: composable.prevPage,
  nextPage: composable.nextPage,
  createApplication: composable.createRestday,
  updateApplication: composable.updateRestday,
  getApplicationById: composable.getRestdayById,
  exportToCSV: composable.exportToCSV
}
</script>
