import { ref, computed } from 'vue'
import apiService from '../services/api.js'

export function useRestdayManagement() {
  // State
  const restdayApplications = ref([])
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

    const requestsRestday = userData.value.permissions.requests_restday || {}
    const approvalsRestday = userData.value.permissions.approvals_restday || {}

    return {
      canCreate: requestsRestday.create || false,
      canRead: requestsRestday.read || approvalsRestday.read || false,
      canUpdate: requestsRestday.edit || false,
      canDelete: requestsRestday.delete || false,
      canCancel: approvalsRestday.delete || false,
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
    return restdayApplications.value.filter(r => r.status === 'pending').length
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

  // Fetch restday applications
  const fetchRestdayApplications = async () => {
    isLoading.value = true

    try {
      const params = {
        page: currentPage.value,
        limit: limit,
        ...filters.value
      }

      const result = await apiService.getRestdayApplications(params)

      if (result.success) {
        restdayApplications.value = result.data || []
        totalRecords.value = result.totalRecords || 0
        totalPages.value = result.totalPages || 1
        currentPage.value = result.currentPage || 1
      } else {
        console.error('Failed to fetch restday applications:', result.message)
        restdayApplications.value = []
      }
    } catch (error) {
      console.error('Error fetching restday applications:', error)
      restdayApplications.value = []
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
    fetchRestdayApplications()
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
      fetchRestdayApplications()
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      fetchRestdayApplications()
    }
  }

  // Create restday
  const createRestday = async (data) => {
    isSaving.value = true

    try {
      const result = await apiService.createRestdayApplication(data)

      if (result.success) {
        await fetchRestdayApplications()
        return { success: true, message: 'Restday application created successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Update restday
  const updateRestday = async (id, data) => {
    isSaving.value = true

    try {
      const result = await apiService.updateRestdayApplication(id, data)

      if (result.success) {
        await fetchRestdayApplications()
        return { success: true, message: 'Restday application updated successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Delete restday
  const deleteRestday = async (id) => {
    isSaving.value = true

    try {
      const result = await apiService.deleteRestdayApplication(id)

      if (result.success) {
        await fetchRestdayApplications()
        return { success: true, message: 'Restday application deleted successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Cancel restday
  const cancelRestday = async (id, remarks) => {
    isSaving.value = true

    try {
      const result = await apiService.cancelRestdayApplication(id, remarks)

      if (result.success) {
        await fetchRestdayApplications()
        return { success: true, message: 'Restday application cancelled successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Get restday by ID
  const getRestdayById = async (id) => {
    try {
      const result = await apiService.getRestdayById(id)
      return result
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // Export to CSV
  const exportToCSV = async () => {
    isExporting.value = true

    try {
      const result = await apiService.exportRestdayToCSV(filters.value)

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
    restdayApplications,
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
    fetchRestdayApplications,
    fetchEmployees,
    applyFilters,
    clearFilters,
    prevPage,
    nextPage,
    createRestday,
    updateRestday,
    deleteRestday,
    cancelRestday,
    getRestdayById,
    exportToCSV
  }
}
