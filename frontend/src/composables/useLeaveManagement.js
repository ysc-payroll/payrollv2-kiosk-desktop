import { ref, computed } from 'vue'
import apiService from '../services/api.js'

export function useLeaveManagement() {
  // State
  const leaveApplications = ref([])
  const employees = ref([])
  const leaveTypes = ref([])
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
    date_from: formatDate(oneMonthBefore),
    date_to: formatDate(oneMonthAfter),
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

    const requestsLeave = userData.value.permissions.requests_leave || {}
    const approvalsLeave = userData.value.permissions.approvals_leave || {}

    return {
      canCreate: requestsLeave.create || false,
      canRead: requestsLeave.read || approvalsLeave.read || false,
      canUpdate: requestsLeave.edit || false,
      canDelete: requestsLeave.delete || false,
      canCancel: approvalsLeave.delete || false,
      canSelectEmployee: true // Always show employee dropdown
    }
  })

  // Computed
  const hasActiveFilters = computed(() => {
    return filters.value.status !== 'all' ||
           filters.value.date_from ||
           filters.value.date_to ||
           filters.value.search
  })

  const pendingCount = computed(() => {
    return leaveApplications.value.filter(l => l.status === 'pending').length
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

  // Fetch leave types
  const fetchLeaveTypes = async () => {
    try {
      const result = await apiService.getLeaveTypes()
      if (result.success) {
        leaveTypes.value = result.data || []
      }
    } catch (error) {
      console.error('Error fetching leave types:', error)
    }
  }

  // Fetch leave applications
  const fetchLeaveApplications = async () => {
    isLoading.value = true

    try {
      const params = {
        page: currentPage.value,
        limit: limit,
        ...filters.value
      }

      const result = await apiService.getLeaveApplications(params)

      if (result.success) {
        leaveApplications.value = result.data || []
        totalRecords.value = result.totalRecords || 0
        totalPages.value = result.totalPages || 1
        currentPage.value = result.currentPage || 1
      } else {
        console.error('Failed to fetch leave applications:', result.message)
        leaveApplications.value = []
      }
    } catch (error) {
      console.error('Error fetching leave applications:', error)
      leaveApplications.value = []
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
    fetchLeaveApplications()
  }

  const clearFilters = () => {
    filters.value = {
      status: 'all',
      date_from: '',
      date_to: '',
      search: ''
    }
    applyFilters()
  }

  // Pagination
  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
      fetchLeaveApplications()
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      fetchLeaveApplications()
    }
  }

  // Create leave
  const createLeave = async (data) => {
    isSaving.value = true

    try {
      const result = await apiService.createLeaveApplication(data)

      if (result.success) {
        await fetchLeaveApplications()
        return { success: true, message: 'Leave application created successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Update leave
  const updateLeave = async (id, data) => {
    isSaving.value = true

    try {
      const result = await apiService.updateLeaveApplication(id, data)

      if (result.success) {
        await fetchLeaveApplications()
        return { success: true, message: 'Leave application updated successfully' }
      } else {
        return { success: false, message: result.message, details: result.details }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Delete leave
  const deleteLeave = async (id) => {
    isSaving.value = true

    try {
      const result = await apiService.deleteLeaveApplication(id)

      if (result.success) {
        await fetchLeaveApplications()
        return { success: true, message: 'Leave application deleted successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Cancel leave
  const cancelLeave = async (id, remarks) => {
    isSaving.value = true

    try {
      const result = await apiService.cancelLeaveApplication(id, remarks)

      if (result.success) {
        await fetchLeaveApplications()
        return { success: true, message: 'Leave application cancelled successfully' }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      return { success: false, message: error.message }
    } finally {
      isSaving.value = false
    }
  }

  // Get leave by ID
  const getLeaveById = async (id) => {
    try {
      const result = await apiService.getLeaveById(id)
      return result
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // Export to CSV
  const exportToCSV = async () => {
    isExporting.value = true

    try {
      const result = await apiService.exportLeaveToCSV(filters.value)

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
    leaveApplications,
    employees,
    leaveTypes,
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
    fetchLeaveTypes,
    fetchLeaveApplications,
    fetchEmployees,
    applyFilters,
    clearFilters,
    prevPage,
    nextPage,
    createLeave,
    updateLeave,
    deleteLeave,
    cancelLeave,
    getLeaveById,
    exportToCSV
  }
}
