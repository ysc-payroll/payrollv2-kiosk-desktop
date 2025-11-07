<template>
  <GenericApplicationView :config="overtimeViewConfig" :composable="composableData">
    <!-- Table slot -->
    <template #table="{ records, isLoading, permissions, handleEdit }">
      <OvertimeTable
        :records="records"
        :is-loading="isLoading"
        :permissions="permissions"
        @edit="handleEdit"
      />
    </template>

    <!-- Dialog slot -->
    <template #dialog="{ isModalOpen, modalMode, selectedRecord, employees, permissions, isSaving, closeModal, handleSubmit }">
      <OvertimeFormDialog
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
import { useOvertimeManagement } from '../composables/useOvertimeManagement'
import GenericApplicationView from './shared/GenericApplicationView.vue'
import OvertimeTable from './overtime/OvertimeTable.vue'
import OvertimeFormDialog from './overtime/OvertimeFormDialog.vue'
import { overtimeViewConfig } from '../configs/viewConfigs.js'

// Get composable data and map to generic names
const composable = useOvertimeManagement()

const composableData = {
  applications: composable.overtimeApplications,
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
  fetchApplications: composable.fetchOvertimeApplications,
  fetchEmployees: composable.fetchEmployees,
  applyFilters: composable.applyFilters,
  prevPage: composable.prevPage,
  nextPage: composable.nextPage,
  createApplication: composable.createOvertime,
  updateApplication: composable.updateOvertime,
  getApplicationById: composable.getOvertimeById,
  exportToCSV: composable.exportToCSV
}
</script>
