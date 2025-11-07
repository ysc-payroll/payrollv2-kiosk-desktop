/**
 * Timesheet Service
 * Handles timesheet creation and synchronization with backend
 */

import httpClient from '../http-client.js'

class TimesheetService {
  constructor(http) {
    this.http = http
  }

  /**
   * Create a timesheet entry on the backend
   */
  async createTimesheet(employeeId, date, logType, logTime) {
    try {
      const response = await this.http.post('/api/timesheets/', {
        employee: employeeId,
        date: date,
        log_type: logType,
        log_time: logTime
      })

      // Success - 201 status returns {timesheet_id: xxx}
      return {
        success: true,
        timesheet_id: response.timesheet_id
      }

    } catch (error) {
      // Handle different error status codes
      if (error.status === 400) {
        // 400 returns a string message or object
        const errorMsg = typeof error.data === 'string'
          ? error.data
          : (error.message || 'Something went wrong. Please try again.')

        return {
          success: false,
          message: errorMsg
        }
      } else if (error.status === 500) {
        // 500 errors - show generic message
        return {
          success: false,
          message: 'Something went wrong. Please try again.'
        }
      } else {
        // Other errors - show generic message
        return {
          success: false,
          message: 'Something went wrong. Please try again.'
        }
      }
    }
  }

  /**
   * Get count of unsynced timesheets from local database
   */
  async getUnsyncedTimesheetsCount() {
    try {
      if (!window.kioskBridge || !window.kioskBridge.getUnsyncedTimesheets) {
        return { success: false, count: 0 }
      }

      const resultJson = await window.kioskBridge.getUnsyncedTimesheets()
      const result = JSON.parse(resultJson)

      if (result.success) {
        return {
          success: true,
          count: result.count || 0
        }
      } else {
        return {
          success: false,
          count: 0
        }
      }

    } catch (error) {
      console.error('Error getting unsynced timesheets count:', error)
      return {
        success: false,
        count: 0
      }
    }
  }

  /**
   * Sync unsynced timesheets to backend API
   */
  async syncTimesheetsToBackend() {
    try {
      // Step 1: Get unsynced timesheets from local database
      if (!window.kioskBridge || !window.kioskBridge.getUnsyncedTimesheets) {
        throw new Error('Bridge not available')
      }

      const resultJson = await window.kioskBridge.getUnsyncedTimesheets()
      const result = JSON.parse(resultJson)

      if (!result.success) {
        throw new Error(result.error || 'Failed to get unsynced timesheets')
      }

      const timesheets = result.data || []

      if (timesheets.length === 0) {
        return {
          success: true,
          synced_count: 0,
          failed_count: 0,
          message: 'No timesheets to sync'
        }
      }

      // Step 2: Sync each timesheet to backend
      let synced_count = 0
      let failed_count = 0
      const errors = []

      for (const timesheet of timesheets) {
        try {
          // Call backend API to create timesheet
          const syncResult = await this.createTimesheet(
            timesheet.employee,  // Backend employee ID
            timesheet.date,
            timesheet.log_type,
            timesheet.log_time
          )

          if (syncResult.success) {
            // Mark as synced in local database
            await window.kioskBridge.markTimesheetSynced(
              timesheet.id,  // Local database ID
              syncResult.timesheet_id  // Backend timesheet ID
            )
            synced_count++
          } else {
            // Mark sync as failed in local database
            await window.kioskBridge.markTimesheetSyncFailed(
              timesheet.id,
              syncResult.message || 'Unknown error'
            )
            failed_count++
            errors.push({
              employee: timesheet.employee_name,
              date: timesheet.date,
              time: timesheet.log_time,
              error: syncResult.message
            })
          }

        } catch (error) {
          // Mark sync as failed
          await window.kioskBridge.markTimesheetSyncFailed(
            timesheet.id,
            error.message || 'Network error'
          )
          failed_count++
          errors.push({
            employee: timesheet.employee_name,
            date: timesheet.date,
            time: timesheet.log_time,
            error: error.message
          })
        }
      }

      return {
        success: true,
        synced_count,
        failed_count,
        total_count: timesheets.length,
        errors,
        message: `Synced ${synced_count}/${timesheets.length} timesheets`
      }

    } catch (error) {
      console.error('Error syncing timesheets:', error)
      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        message: error.message || 'Failed to sync timesheets'
      }
    }
  }
}

// Create singleton instance
const timesheetService = new TimesheetService(httpClient)

export default timesheetService
