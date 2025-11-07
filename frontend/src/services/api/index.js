/**
 * API Services - Main Export
 * Provides clean, organized access to all API services
 */

// Import services
import authServiceInstance from './auth.service.js'
import employeeServiceInstance from './employee.service.js'
import timesheetServiceInstance from './timesheet.service.js'
import overtimeServiceInstance from './overtime.service.js'
import holidayServiceInstance from './holiday.service.js'
import restdayServiceInstance from './restday.service.js'
import undertimeServiceInstance from './undertime.service.js'
import leaveServiceInstance from './leave.service.js'

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
  auth: authServiceInstance,
  employee: employeeServiceInstance,
  timesheet: timesheetServiceInstance,
  overtime: overtimeServiceInstance,
  holiday: holidayServiceInstance,
  restday: restdayServiceInstance,
  undertime: undertimeServiceInstance,
  leave: leaveServiceInstance
}
