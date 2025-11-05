import { ref, computed } from 'vue'
import apiService from '../services/api.js'

export function useOvertimeManagement() {
  // State
  const overtimeApplications = ref([])
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

    const requestsOT = userData.value.permissions.requests_overtime || {}
    const approvalsOT = userData.value.permissions.approvals_overtime || {}

    return {
      canCreate: requestsOT.create || false,
      canRead: requestsOT.read || approvalsOT.read || false,
      canUpdate: requestsOT.edit || false,
      canDelete: requestsOT.delete || false,
      canCancel: approvalsOT.delete || false,
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
    return overtimeApplications.value.filter(ot => ot.status === 'pending').length
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

  // Fetch overtime applications
  const fetchOvertimeApplications = async () => {
    isLoading.value = true

    try {
      const params = {
        page: currentPage.value,
        limit: limit,
        ...filters.value
      }

      const result = await apiService.getOvertimeApplications(params)

      if (result.success) {
        overtimeApplications.value = result.data || []
        totalRecords.value = result.totalRecords || 0
        totalPages.value = result.totalPages || 1
        currentPage.value = result.currentPage || 1
      } else {
        console.error('Failed to fetch overtime applications:', result.message)
        overtimeApplications.value = []
      }
    } catch (error) {
      console.error('Error fetching overtime applications:', error)
      overtimeApplications.value = []
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
    fetchOvertimeApplications()
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
      fetchOvertimeApplications()
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      fetchOvertimeApplications()
    }
  }

  // Create overtime
  const createOvertime = async (data) => {
    isSaving.value = true

    try {
      const result = await apiService.createOvertimeApplication(data)

      if (result.success) {
        await fetchOvertimeApplications()
        return { success: true, message: 'Overtime created successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Update overtime
  const updateOvertime = async (id, data) => {
    isSaving.value = true

    try {
      const result = await apiService.updateOvertimeApplication(id, data)

      if (result.success) {
        await fetchOvertimeApplications()
        return { success: true, message: 'Overtime updated successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Delete overtime
  const deleteOvertime = async (id) => {
    isSaving.value = true

    try {
      const result = await apiService.deleteOvertimeApplication(id)

      if (result.success) {
        await fetchOvertimeApplications()
        return { success: true, message: 'Overtime deleted successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Cancel overtime
  const cancelOvertime = async (id, remarks) => {
    isSaving.value = true

    try {
      const result = await apiService.cancelOvertimeApplication(id, remarks)

      if (result.success) {
        await fetchOvertimeApplications()
        return { success: true, message: 'Overtime cancelled successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Get overtime by ID
  const getOvertimeById = async (id) => {
    try {
      const result = await apiService.getOvertimeById(id)
      return result
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // Export to CSV
  const exportToCSV = async () => {
    isExporting.value = true

    try {
      const result = await apiService.exportOvertimeToCSV(filters.value)

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
    overtimeApplications,
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
    fetchOvertimeApplications,
    fetchEmployees,
    applyFilters,
    clearFilters,
    prevPage,
    nextPage,
    createOvertime,
    updateOvertime,
    deleteOvertime,
    cancelOvertime,
    getOvertimeById,
    exportToCSV
  }
}
