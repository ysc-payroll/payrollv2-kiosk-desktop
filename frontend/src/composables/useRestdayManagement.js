/**
 * Restday Management Composable
 * Uses generic useApplicationManagement with restday-specific configuration
 */

import { useApplicationManagement } from './useApplicationManagement.js'
import { restdayService } from '../services/api/index.js'

export function useRestdayManagement() {
  // Get base composable with restday configuration
  const base = useApplicationManagement('restday', restdayService, {
    limit: 20,
    permissionPrefix: 'requests_restday',
    approvalsPrefix: 'approvals_restday'
  })

  // Return base composable with alias for clarity
  return {
    ...base,
    restdayApplications: base.applications
  }
}
