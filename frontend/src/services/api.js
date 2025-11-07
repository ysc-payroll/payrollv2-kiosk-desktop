/**
 * API Service - Backward Compatibility Layer
 *
 * This file provides backward compatibility for existing components
 * that still import from '@/services/api'
 *
 * New code should import from '@/services/api/<service-name>.service'
 */

import httpClient from './http-client.js'
import authService from './api/auth.service.js'
import employeeService from './api/employee.service.js'
import timesheetService from './api/timesheet.service.js'
import overtimeService from './api/overtime.service.js'
import holidayService from './api/holiday.service.js'
import restdayService from './api/restday.service.js'
import undertimeService from './api/undertime.service.js'
import leaveService from './api/leave.service.js'

/**
 * Legacy API Service Class
 * Maintains old interface while delegating to new services
 */
class ApiService {
  constructor() {
    this.baseURL = httpClient.baseURL
  }

  // Token Management
  get accessToken() {
    return httpClient.accessToken
  }

  get refreshToken() {
    return httpClient.refreshToken
  }

  setTokens(accessToken, refreshToken) {
    return httpClient.setTokens(accessToken, refreshToken)
  }

  loadTokens() {
    return httpClient.loadTokens()
  }

  clearTokens() {
    return httpClient.clearTokens()
  }

  // HTTP Methods
  async request(endpoint, options) {
    return httpClient.request(endpoint, options)
  }

  // Authentication Methods
  async login(email, password) {
    return authService.login(email, password)
  }

  async refreshAccessToken() {
    return httpClient.refreshAccessToken()
  }

  async verifyToken() {
    return authService.verifyToken()
  }

  async logout() {
    return authService.logout()
  }

  async getUserInfo() {
    return authService.getUserInfo()
  }

  _mapRightsToPermissions(rights) {
    return authService._mapRightsToPermissions(rights)
  }

  // Employee Methods
  async getEmployeesTimekeeper() {
    return employeeService.getEmployeesTimekeeper()
  }

  async syncEmployeesWithCleanup() {
    return employeeService.syncEmployeesWithCleanup()
  }

  // Timesheet Methods
  async createTimesheet(employeeId, date, logType, logTime) {
    return timesheetService.createTimesheet(employeeId, date, logType, logTime)
  }

  async getUnsyncedTimesheetsCount() {
    return timesheetService.getUnsyncedTimesheetsCount()
  }

  async syncTimesheetsToBackend() {
    return timesheetService.syncTimesheetsToBackend()
  }

  // Utility Methods
  getUserData() {
    const userData = localStorage.getItem('user_data')
    return userData ? JSON.parse(userData) : null
  }

  getCompanyData() {
    const companyData = localStorage.getItem('company_data')
    return companyData ? JSON.parse(companyData) : null
  }

  isAuthenticated() {
    return !!httpClient.accessToken || !!localStorage.getItem('access_token')
  }

  // Overtime Methods
  async getOvertimeApplications(params) {
    return overtimeService.getAll(params)
  }

  async createOvertimeApplication(data) {
    return overtimeService.create(data)
  }

  async getOvertimeById(id) {
    return overtimeService.getById(id)
  }

  async updateOvertimeApplication(id, data) {
    return overtimeService.update(id, data)
  }

  async deleteOvertimeApplication(id) {
    return overtimeService.delete(id)
  }

  async reviewOvertimeApplication(id, remarks) {
    return overtimeService.review(id, remarks)
  }

  async approveOvertimeApplication(id, data) {
    return overtimeService.approve(id, data)
  }

  async disapproveOvertimeApplication(id, remarks) {
    return overtimeService.disapprove(id, remarks)
  }

  async cancelOvertimeApplication(id, remarks) {
    return overtimeService.cancel(id, remarks)
  }

  async getOvertimeAttachment(id) {
    return overtimeService.getAttachment(id)
  }

  async getOvertimeAttachmentInfo(id) {
    return overtimeService.getAttachmentInfo(id)
  }

  async replaceOvertimeAttachment(id, file) {
    return overtimeService.replaceAttachment(id, file)
  }

  async exportOvertimeToCSV(params) {
    return overtimeService.exportToCSV(params)
  }

  // Holiday Methods
  async getHolidayApplications(params) {
    return holidayService.getAll(params)
  }

  async createHolidayApplication(data) {
    return holidayService.create(data)
  }

  async getHolidayById(id) {
    return holidayService.getById(id)
  }

  async updateHolidayApplication(id, data) {
    return holidayService.update(id, data)
  }

  async deleteHolidayApplication(id) {
    return holidayService.delete(id)
  }

  async cancelHolidayApplication(id, remarks) {
    return holidayService.cancel(id, remarks)
  }

  async exportHolidayToCSV(params) {
    return holidayService.exportToCSV(params)
  }

  // Restday Methods
  async getRestdayApplications(params) {
    return restdayService.getAll(params)
  }

  async getRestdayById(id) {
    return restdayService.getById(id)
  }

  async createRestdayApplication(data) {
    return restdayService.create(data)
  }

  async updateRestdayApplication(id, data) {
    return restdayService.update(id, data)
  }

  async deleteRestdayApplication(id) {
    return restdayService.delete(id)
  }

  async cancelRestdayApplication(id, remarks) {
    return restdayService.cancel(id, remarks)
  }

  async exportRestdayToCSV(params) {
    return restdayService.exportToCSV(params)
  }

  // Undertime Methods
  async getUndertimeApplications(params) {
    return undertimeService.getAll(params)
  }

  async getUndertimeById(id) {
    return undertimeService.getById(id)
  }

  async createUndertimeApplication(data) {
    return undertimeService.create(data)
  }

  async updateUndertimeApplication(id, data) {
    return undertimeService.update(id, data)
  }

  async deleteUndertimeApplication(id) {
    return undertimeService.delete(id)
  }

  async cancelUndertimeApplication(id, remarks) {
    return undertimeService.cancel(id, remarks)
  }

  async exportUndertimeToCSV(params) {
    return undertimeService.exportToCSV(params)
  }

  // Leave Methods
  async getLeaveTypes() {
    return leaveService.getLeaveTypes()
  }

  async getLeaveApplications(params) {
    return leaveService.getAll(params)
  }

  async getLeaveById(id) {
    return leaveService.getById(id)
  }

  async createLeaveApplication(data) {
    return leaveService.create(data)
  }

  async updateLeaveApplication(id, data) {
    return leaveService.update(id, data)
  }

  async deleteLeaveApplication(id) {
    return leaveService.delete(id)
  }

  async cancelLeaveApplication(id, remarks) {
    return leaveService.cancel(id, remarks)
  }

  async exportLeaveToCSV(params) {
    return leaveService.exportToCSV(params)
  }
}

// Create singleton instance
const apiService = new ApiService()

// Auto-load tokens
apiService.loadTokens()

// Default export (backward compatible)
export default apiService

// Named exports for new code
export {
  httpClient,
  authService,
  employeeService,
  timesheetService,
  overtimeService,
  holidayService,
  restdayService,
  undertimeService,
  leaveService
}
