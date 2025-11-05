import { ref, computed } from 'vue'
import apiService from '../services/api.js'

export function useUndertimeManagement() {
  // State
  const undertimeApplications = ref([])
  const employees = ref([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isExporting = ref(false)
  const currentPage = ref(1)
  const totalRecords = ref(0)
  const totalPages = ref(1)
  const limit = 20

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

    const requestsUndertime = userData.value.permissions.requests_undertime || {}
    const approvalsUndertime = userData.value.permissions.approvals_undertime || {}

    return {
      canCreate: requestsUndertime.create || false,
      canRead: requestsUndertime.read || approvalsUndertime.read || false,
      canUpdate: requestsUndertime.edit || false,
      canDelete: requestsUndertime.delete || false,
      canCancel: approvalsUndertime.delete || false,
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
    return undertimeApplications.value.filter(u => u.status === 'pending').length
  })

  const startRecord = computed(() => {
    if (totalRecords.value === 0) return 0
    return (currentPage.value - 1) * limit + 1
  })

  const endRecord = computed(() => {
    return Math.min(currentPage.value * limit, totalRecords.value)
  })

  // Load permissions
  const loadPermissions = () => {
    userData.value = apiService.getUserData()
  }

  // Fetch undertime applications
  const fetchUndertimeApplications = async () => {
    isLoading.value = true

    try {
      const params = {
        page: currentPage.value,
        limit: limit,
        ...filters.value
      }

      const result = await apiService.getUndertimeApplications(params)

      if (result.success) {
        undertimeApplications.value = result.data || []
        totalRecords.value = result.totalRecords || 0
        totalPages.value = result.totalPages || 1
        currentPage.value = result.currentPage || 1
      } else {
        console.error('Failed to fetch undertime applications:', result.message)
        undertimeApplications.value = []
      }
    } catch (error) {
      console.error('Error fetching undertime applications:', error)
      undertimeApplications.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Fetch employees for dropdown
  const fetchEmployees = async () => {
    if (!permissions.value.canSelectEmployee) return

    try {
      const result = await apiService.getEmployeesTimekeeper()
      if (result.success) {
        employees.value = result.data || []
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  // Filter operations
  const applyFilters = () => {
    currentPage.value = 1
    fetchUndertimeApplications()
  }

  const clearFilters = () => {
    filters.value = {
      status: 'all',
      application_date_from: '',
      application_date_to: '',
      search: ''
    }
    applyFilters()
  }

  // Pagination
  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
      fetchUndertimeApplications()
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      fetchUndertimeApplications()
    }
  }

  // Create undertime
  const createUndertime = async (data) => {
    isSaving.value = true

    try {
      const result = await apiService.createUndertimeApplication(data)

      if (result.success) {
        await fetchUndertimeApplications()
        return { success: true, message: 'Undertime application created successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Update undertime
  const updateUndertime = async (id, data) => {
    isSaving.value = true

    try {
      const result = await apiService.updateUndertimeApplication(id, data)

      if (result.success) {
        await fetchUndertimeApplications()
        return { success: true, message: 'Undertime application updated successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Delete undertime
  const deleteUndertime = async (id) => {
    isSaving.value = true

    try {
      const result = await apiService.deleteUndertimeApplication(id)

      if (result.success) {
        await fetchUndertimeApplications()
        return { success: true, message: 'Undertime application deleted successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Cancel undertime
  const cancelUndertime = async (id, remarks) => {
    isSaving.value = true

    try {
      const result = await apiService.cancelUndertimeApplication(id, remarks)

      if (result.success) {
        await fetchUndertimeApplications()
        return { success: true, message: 'Undertime application cancelled successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Get undertime by ID
  const getUndertimeById = async (id) => {
    try {
      const result = await apiService.getUndertimeById(id)
      return result
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // Export to CSV
  const exportToCSV = async () => {
    isExporting.value = true

    try {
      const result = await apiService.exportUndertimeToCSV(filters.value)

      if (result.success) {
        return { success: true, message: 'Export completed successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isExporting.value = false
    }
  }

  return {
    // State
    undertimeApplications,
    employees,
    isLoading,
    isSaving,
    isExporting,
    currentPage,
    totalRecords,
    totalPages,
    limit,
    filters,
    permissions,

    // Computed
    hasActiveFilters,
    pendingCount,
    startRecord,
    endRecord,

    // Methods
    loadPermissions,
    fetchUndertimeApplications,
    fetchEmployees,
    applyFilters,
    clearFilters,
    prevPage,
    nextPage,
    createUndertime,
    updateUndertime,
    deleteUndertime,
    cancelUndertime,
    getUndertimeById,
    exportToCSV
  }
}
