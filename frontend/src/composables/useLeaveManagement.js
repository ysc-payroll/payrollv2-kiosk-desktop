/**
 * Leave Management Composable
 * Uses generic useApplicationManagement with leave-specific configuration
 */

import { ref } from 'vue'
import { useApplicationManagement } from './useApplicationManagement.js'
import { leaveService } from '../services/api/index.js'

export function useLeaveManagement() {
  // Get base composable with leave configuration
  const base = useApplicationManagement('leave', leaveService, {
    limit: 20,
    permissionPrefix: 'requests_leave',
    approvalsPrefix: 'approvals_leave'
  })

  // Leave-specific state
  const leaveTypes = ref([])
  const isLoadingLeaveTypes = ref(false)

  // Fetch leave types
  const fetchLeaveTypes = async () => {
    isLoadingLeaveTypes.value = true
    try {
      const result = await leaveService.getLeaveTypes()
      if (result.success) {
        leaveTypes.value = result.data || []
      } else {
        console.error('Error fetching leave types:', result.message)
        leaveTypes.value = []
      }
    } catch (error) {
      console.error('Error fetching leave types:', error)
      leaveTypes.value = []
    } finally {
      isLoadingLeaveTypes.value = false
    }
  }

  // Return base composable + leave-specific features
  return {
    ...base,
    leaveApplications: base.applications,
    leaveTypes,
    isLoadingLeaveTypes,
    fetchLeaveTypes
  }
}
