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

  // Return base composable with alias for clarity
  return {
    ...base,
    undertimeApplications: base.applications
  }
}
