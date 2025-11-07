/**
 * API Services - Main Export
 * Provides clean, organized access to all API services
 */

// Export HTTP client
export { default as httpClient } from '../http-client.js'

// Export individual services
export { default as authService } from './auth.service.js'
export { default as employeeService } from './employee.service.js'
export { default as timesheetService } from './timesheet.service.js'
export { default as overtimeService } from './overtime.service.js'
export { default as holidayService } from './holiday.service.js'
export { default as restdayService } from './restday.service.js'
export { default as undertimeService } from './undertime.service.js'
export { default as leaveService } from './leave.service.js'

// Export base service for custom extensions
export { BaseCrudService } from './base.service.js'

/**
 * Default export: all services in one object
 * Usage: import api from '@/services/api'
 *        api.auth.login(email, password)
 */
export default {
  auth: authService,
  employee: employeeService,
  timesheet: timesheetService,
  overtime: overtimeService,
  holiday: holidayService,
  restday: restdayService,
  undertime: undertimeService,
  leave: leaveService
}
