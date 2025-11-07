/**
 * Undertime Management Composable
 * Uses generic useApplicationManagement with undertime-specific configuration
 */

import { useApplicationManagement } from './useApplicationManagement.js'
import { undertimeService } from '../services/api/index.js'

export function useUndertimeManagement() {
  // Get base composable with undertime configuration
  const base = useApplicationManagement('undertime', undertimeService, {
    limit: 20,
    permissionPrefix: 'requests_undertime',
    approvalsPrefix: 'approvals_undertime'
  })

  // Return base composable with aliases for clarity
  return {
    ...base,
    undertimeApplications: base.applications,
    fetchUndertimeApplications: base.fetchApplications,
    createUndertime: base.createApplication,
    updateUndertime: base.updateApplication,
    deleteUndertime: base.deleteApplication,
    cancelUndertime: base.cancelApplication,
    getUndertimeById: base.getApplicationById
  }
}
