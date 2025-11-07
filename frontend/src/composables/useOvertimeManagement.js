/**
 * Overtime Management Composable
 * Uses generic useApplicationManagement with overtime-specific configuration
 */

import { useApplicationManagement } from './useApplicationManagement.js'
import { overtimeService } from '../services/api/index.js'

export function useOvertimeManagement() {
  // Get base composable with overtime configuration
  const base = useApplicationManagement('overtime', overtimeService, {
    limit: 20,
    permissionPrefix: 'requests_overtime',
    approvalsPrefix: 'approvals_overtime'
  })

  // Return base composable with aliases for clarity
  return {
    ...base,
    overtimeApplications: base.applications,
    fetchOvertimeApplications: base.fetchApplications,
    createOvertime: base.createApplication,
    updateOvertime: base.updateApplication,
    deleteOvertime: base.deleteApplication,
    cancelOvertime: base.cancelApplication,
    getOvertimeById: base.getApplicationById
  }
}
