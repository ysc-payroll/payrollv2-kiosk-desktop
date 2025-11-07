<template>
  <GenericApplicationView :config="undertimeViewConfig" :composable="composableData">
    <!-- Table slot -->
    <template #table="{ records, isLoading, permissions, handleEdit }">
      <UndertimeTable
        :records="records"
        :is-loading="isLoading"
        :permissions="permissions"
        @edit="handleEdit"
      />
    </template>

    <!-- Dialog slot -->
    <template #dialog="{ isModalOpen, modalMode, selectedRecord, employees, permissions, isSaving, closeModal, handleSubmit }">
      <UndertimeFormDialog
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
import { useUndertimeManagement } from '../composables/useUndertimeManagement'
import GenericApplicationView from './shared/GenericApplicationView.vue'
import UndertimeTable from './undertime/UndertimeTable.vue'
import UndertimeFormDialog from './undertime/UndertimeFormDialog.vue'
import { undertimeViewConfig } from '../configs/viewConfigs.js'

// Get composable data and map to generic names
const composable = useUndertimeManagement()

const composableData = {
  applications: composable.undertimeApplications,
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
  fetchApplications: composable.fetchUndertimeApplications,
  fetchEmployees: composable.fetchEmployees,
  applyFilters: composable.applyFilters,
  prevPage: composable.prevPage,
  nextPage: composable.nextPage,
  createApplication: composable.createUndertime,
  updateApplication: composable.updateUndertime,
  getApplicationById: composable.getUndertimeById,
  exportToCSV: composable.exportToCSV
}
</script>
