<template>
  <GenericApplicationView :config="holidayViewConfig" :composable="composableData">
    <!-- Table slot -->
    <template #table="{ records, isLoading, permissions, handleEdit }">
      <HolidayTable
        :records="records"
        :is-loading="isLoading"
        :permissions="permissions"
        @edit="handleEdit"
      />
    </template>

    <!-- Dialog slot -->
    <template #dialog="{ isModalOpen, modalMode, selectedRecord, employees, permissions, isSaving, closeModal, handleSubmit }">
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
    </template>
  </GenericApplicationView>
</template>

<script setup>
import { useHolidayManagement } from '../composables/useHolidayManagement'
import GenericApplicationView from './shared/GenericApplicationView.vue'
import HolidayTable from './holiday/HolidayTable.vue'
import HolidayFormDialog from './holiday/HolidayFormDialog.vue'
import { holidayViewConfig } from '../configs/viewConfigs.js'

// Get composable data and map to generic names
const composable = useHolidayManagement()

const composableData = {
  applications: composable.holidayApplications,
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
  fetchApplications: composable.fetchHolidayApplications,
  fetchEmployees: composable.fetchEmployees,
  applyFilters: composable.applyFilters,
  prevPage: composable.prevPage,
  nextPage: composable.nextPage,
  createApplication: composable.createHoliday,
  updateApplication: composable.updateHoliday,
  getApplicationById: composable.getHolidayById,
  exportToCSV: composable.exportToCSV
}
</script>
