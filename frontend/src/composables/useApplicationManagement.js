/**
 * Generic Application Management Composable
 * Provides common CRUD operations and state management for all application types
 * (Overtime, Holiday, Restday, Undertime, Leave)
 */

import { ref, computed } from 'vue'
import apiService from '../services/api.js'

/**
 * Create an application management composable
 * @param {string} resourceType - Type of resource: 'overtime', 'holiday', 'restday', 'undertime', 'leave'
 * @param {Object} serviceApi - API service methods for the resource
 * @param {Object} options - Optional configuration
 * @returns {Object} Composable interface
 */
export function useApplicationManagement(resourceType, serviceApi, options = {}) {
  // Validate resource type
  const validTypes = ['overtime', 'holiday', 'restday', 'undertime', 'leave']
  if (!validTypes.includes(resourceType)) {
    throw new Error(`Invalid resource type: ${resourceType}. Must be one of: ${validTypes.join(', ')}`)
  }

  // Configuration
  const config = {
    limit: options.limit || 20,
    permissionPrefix: options.permissionPrefix || `requests_${resourceType}`,
    approvalsPrefix: options.approvalsPrefix || `approvals_${resourceType}`,
    ...options
  }

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate default dates (1 month before and 1 month after today)
  const today = new Date()
  const oneMonthBefore = new Date(today)
  oneMonthBefore.setMonth(today.getMonth() - 1)
  const oneMonthAfter = new Date(today)
  oneMonthAfter.setMonth(today.getMonth() + 1)

  // State
  const applications = ref([])
  const employees = ref([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isExporting = ref(false)
  const currentPage = ref(1)
  const totalRecords = ref(0)
  const totalPages = ref(1)

  // Filters
  const filters = ref({
    status: 'pending',
    application_date_from: formatDate(oneMonthBefore),
    application_date_to: formatDate(oneMonthAfter),
    search: ''
  })

  // Permissions
  const userData = ref(null)
  const permissions = computed(() => {
    if (!userData.value?.permissions) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canCancel: false,
        canSelectEmployee: false
      }
    }

    const requests = userData.value.permissions[config.permissionPrefix] || {}
    const approvals = userData.value.permissions[config.approvalsPrefix] || {}

    return {
      canCreate: requests.create || false,
      canRead: requests.read || approvals.read || false,
      canUpdate: requests.edit || false,
      canDelete: requests.delete || false,
      canCancel: approvals.delete || false,
      canSelectEmployee: true // Always show employee dropdown
    }
  })

  // Computed
  const hasActiveFilters = computed(() => {
    return filters.value.status !== 'all' ||
           filters.value.application_date_from ||
           filters.value.application_date_to ||
           filters.value.search
  })

  const pendingCount = computed(() => {
    return applications.value.filter(app => app.status === 'pending').length
  })

  const startRecord = computed(() => {
    if (totalRecords.value === 0) return 0
    return (currentPage.value - 1) * config.limit + 1
  })

  const endRecord = computed(() => {
    return Math.min(currentPage.value * config.limit, totalRecords.value)
  })

  // Load permissions
  const loadPermissions = () => {
    userData.value = apiService.getUserData()
  }

  // Fetch applications
  const fetchApplications = async () => {
    isLoading.value = true

    try {
      const params = {
        page: currentPage.value,
        limit: config.limit,
        ...filters.value
      }

      const result = await serviceApi.getAll(params)

      if (result.success) {
        applications.value = result.data
        totalRecords.value = result.totalRecords || 0
        totalPages.value = result.totalPages || 1
        currentPage.value = result.currentPage || 1
      } else {
        console.error(`Error fetching ${resourceType} applications:`, result.message)
        applications.value = []
      }
    } catch (error) {
      console.error(`Error fetching ${resourceType} applications:`, error)
      applications.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const result = await apiService.getEmployeesTimekeeper()
      if (result.success) {
        employees.value = result.data || []
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      employees.value = []
    }
  }

  // Create application
  const createApplication = async (applicationData) => {
    isSaving.value = true
    try {
      const result = await serviceApi.create(applicationData)
      if (result.success) {
        await fetchApplications()
        return { success: true, message: `${capitalize(resourceType)} created successfully` }
      } else {
        return { success: false, message: result.message || 'Failed to create application' }
      }
    } catch (error) {
      console.error(`Error creating ${resourceType}:`, error)
      return { success: false, message: error.message || 'Failed to create application' }
    } finally {
      isSaving.value = false
    }
  }

  // Update application
  const updateApplication = async (id, applicationData) => {
    isSaving.value = true
    try {
      const result = await serviceApi.update(id, applicationData)
      if (result.success) {
        await fetchApplications()
        return { success: true, message: `${capitalize(resourceType)} updated successfully` }
      } else {
        return { success: false, message: result.message || 'Failed to update application' }
      }
    } catch (error) {
      console.error(`Error updating ${resourceType}:`, error)
      return { success: false, message: error.message || 'Failed to update application' }
    } finally {
      isSaving.value = false
    }
  }

  // Delete application
  const deleteApplication = async (id) => {
    isSaving.value = true
    try {
      const result = await serviceApi.delete(id)
      if (result.success) {
        await fetchApplications()
        return { success: true, message: `${capitalize(resourceType)} deleted successfully` }
      } else {
        return { success: false, message: result.message || 'Failed to delete application' }
      }
    } catch (error) {
      console.error(`Error deleting ${resourceType}:`, error)
      return { success: false, message: error.message || 'Failed to delete application' }
    } finally {
      isSaving.value = false
    }
  }

  // Cancel application
  const cancelApplication = async (id, remarks) => {
    isSaving.value = true
    try {
      const result = await serviceApi.cancel(id, remarks)
      if (result.success) {
        await fetchApplications()
        return { success: true, message: `${capitalize(resourceType)} cancelled successfully` }
      } else {
        return { success: false, message: result.message || 'Failed to cancel application' }
      }
    } catch (error) {
      console.error(`Error cancelling ${resourceType}:`, error)
      return { success: false, message: error.message || 'Failed to cancel application' }
    } finally {
      isSaving.value = false
    }
  }

  // Export to CSV
  const exportToCSV = async () => {
    isExporting.value = true
    try {
      const result = await serviceApi.exportToCSV(filters.value)
      if (result.success) {
        return { success: true, csv: result.csv }
      } else {
        return { success: false, message: result.message || 'Failed to export' }
      }
    } catch (error) {
      console.error(`Error exporting ${resourceType}:`, error)
      return { success: false, message: error.message || 'Failed to export' }
    } finally {
      isExporting.value = false
    }
  }

  // Pagination
  const goToPage = (page) => {
    currentPage.value = page
    fetchApplications()
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      fetchApplications()
    }
  }

  const previousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
      fetchApplications()
    }
  }

  // Filters
  const applyFilters = () => {
    currentPage.value = 1
    fetchApplications()
  }

  const clearFilters = () => {
    filters.value = {
      status: 'pending',
      application_date_from: formatDate(oneMonthBefore),
      application_date_to: formatDate(oneMonthAfter),
      search: ''
    }
    currentPage.value = 1
    fetchApplications()
  }

  // Helper function to capitalize first letter
  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Return composable interface
  return {
    // State
    applications,
    employees,
    isLoading,
    isSaving,
    isExporting,
    currentPage,
    totalRecords,
    totalPages,
    filters,
    userData,

    // Computed
    permissions,
    hasActiveFilters,
    pendingCount,
    startRecord,
    endRecord,

    // Methods
    loadPermissions,
    fetchApplications,
    fetchEmployees,
    createApplication,
    updateApplication,
    deleteApplication,
    cancelApplication,
    exportToCSV,
    goToPage,
    nextPage,
    previousPage,
    applyFilters,
    clearFilters
  }
}
