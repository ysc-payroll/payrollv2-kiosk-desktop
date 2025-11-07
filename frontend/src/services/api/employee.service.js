/**
 * Employee Service
 * Handles employee data retrieval and synchronization
 */

import httpClient from '../http-client.js'

class EmployeeService {
  constructor(http) {
    this.http = http
  }

  /**
   * Get employees for timekeeper (simplified endpoint)
   * Returns all active employees in flat array format
   */
  async getEmployeesTimekeeper() {
    try {
      const response = await this.http.get('/api/employees/timekeeper/')

      // Response is a flat array, not a paginated object
      return {
        success: true,
        data: response || [],
        totalRecords: response ? response.length : 0
      }

    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
        totalRecords: 0
      }
    }
  }

  /**
   * Sync employees from API with cleanup (soft-delete removed employees)
   * This is for the manual "Refresh from Live" button
   */
  async syncEmployeesWithCleanup() {
    try {
      // Step 1: Fetch employees from API using the timekeeper endpoint
      const employeesResponse = await this.http.get('/api/employees/timekeeper/')

      // The timekeeper endpoint returns a flat array, not a paginated object
      if (!employeesResponse || !Array.isArray(employeesResponse)) {
        throw new Error('Invalid response from API')
      }

      const employees = employeesResponse

      // Step 2: Call bridge method to sync with cleanup
      if (!window.kioskBridge || !window.kioskBridge.syncEmployeesFromAPIWithCleanup) {
        throw new Error('Bridge method not available')
      }

      const result = await window.kioskBridge.syncEmployeesFromAPIWithCleanup(JSON.stringify(employees))
      const parsedResult = JSON.parse(result)

      if (parsedResult.success) {
        return {
          success: true,
          data: parsedResult,
          message: parsedResult.message
        }
      } else {
        return {
          success: false,
          message: parsedResult.error || 'Failed to sync employees'
        }
      }

    } catch (error) {
      console.error('Error syncing employees with cleanup:', error)
      return {
        success: false,
        message: error.message || 'Failed to sync employees'
      }
    }
  }
}

// Create singleton instance
const employeeService = new EmployeeService(httpClient)

export default employeeService
