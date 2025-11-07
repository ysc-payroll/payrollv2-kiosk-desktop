/**
 * Holiday Management Composable
 * Uses generic useApplicationManagement with holiday-specific configuration
 */

import { useApplicationManagement } from './useApplicationManagement.js'
import { holidayService } from '../services/api/index.js'

export function useHolidayManagement() {
  // Get base composable with holiday configuration
  const base = useApplicationManagement('holiday', holidayService, {
    limit: 20,
    permissionPrefix: 'requests_holiday',
    approvalsPrefix: 'approvals_holiday'
  })

  // Return base composable with alias for clarity
  return {
    ...base,
    holidayApplications: base.applications
  }
}
