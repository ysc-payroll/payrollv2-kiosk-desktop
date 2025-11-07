/**
 * Leave Service
 * Handles leave application CRUD operations and leave types
 */

import httpClient from '../http-client.js'
import { BaseCrudService } from './base.service.js'

class LeaveService extends BaseCrudService {
  constructor(http) {
    super(http, '/api/applications/leave')
    this.http = http
  }

  /**
   * Get leave types dropdown
   */
  async getLeaveTypes() {
    try {
      const response = await this.http.get('/api/misc/leave_types/dropdown/')

      // Handle direct array response (no success wrapper)
      if (Array.isArray(response)) {
        return {
          success: true,
          data: response
        }
      }

      // Handle wrapped response
      if (response.success) {
        return {
          success: true,
          data: response.data || []
        }
      }

      return {
        success: false,
        message: response.message || 'Failed to fetch leave types'
      }
    } catch (error) {
      console.error('Error fetching leave types:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch leave types'
      }
    }
  }

  /**
   * Get leave applications with pagination and filters
   */
  async getAll(params = {}) {
    try {
      // Build query string
      const queryParams = new URLSearchParams()

      if (params.page) queryParams.append('current_page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)
      if (params.search) queryParams.append('search', params.search)

      const endpoint = `${this.endpoint}/?${queryParams.toString()}`

      const response = await this.http.get(endpoint)

      return {
        success: true,
        data: response.data || [],
        totalRecords: response.total_records || 0,
        totalPages: response.total_pages || 1,
        currentPage: response.current_page || 1
      }

    } catch (error) {
      console.error('Error fetching leave applications:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch leave applications',
        data: []
      }
    }
  }

  /**
   * Get single leave application by ID
   */
  async getById(id) {
    try {
      const response = await this.http.get(`${this.endpoint}/${id}/`)

      return {
        success: true,
        data: response
      }

    } catch (error) {
      console.error('Error fetching leave application:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch leave application'
      }
    }
  }

  /**
   * Create new leave application
   */
  async create(data) {
    try {
      const formData = new FormData()

      formData.append('employee', data.employee)
      formData.append('leave_type', data.leave_type)
      formData.append('terms', data.terms)
      formData.append('start_date', data.start_date)

      // Only add end_date for wholeday leaves
      if (data.terms === 'wholeday' && data.end_date) {
        formData.append('end_date', data.end_date)
      } else if (data.terms === 'halfday') {
        // For halfday, end_date equals start_date
        formData.append('end_date', data.start_date)
      }

      // Add halfday period
      if (data.terms === 'halfday') {
        formData.append('halfday_is_first_half', data.halfday_is_first_half ? 'true' : 'false')
      }

      if (data.reason) {
        formData.append('reason', data.reason)
      }

      if (data.attachment) {
        formData.append('attachment', data.attachment)
      }

      const response = await this.http.post(`${this.endpoint}/`, formData)

      return {
        success: true,
        data: response
      }

    } catch (error) {
      console.error('Error creating leave application:', error)
      return {
        success: false,
        message: error.message || 'Failed to create leave application',
        details: error.data
      }
    }
  }

  /**
   * Update leave application
   */
  async update(id, data) {
    try {
      const formData = new FormData()

      if (data.employee) formData.append('employee', data.employee)
      if (data.leave_type) formData.append('leave_type', data.leave_type)
      if (data.terms) formData.append('terms', data.terms)
      if (data.start_date) formData.append('start_date', data.start_date)

      // Handle end_date based on terms
      if (data.terms === 'wholeday' && data.end_date) {
        formData.append('end_date', data.end_date)
      } else if (data.terms === 'halfday') {
        formData.append('end_date', data.start_date)
      }

      // Add halfday period
      if (data.terms === 'halfday') {
        formData.append('halfday_is_first_half', data.halfday_is_first_half ? 'true' : 'false')
      }

      if (data.reason) {
        formData.append('reason', data.reason)
      }

      if (data.attachment) {
        formData.append('attachment', data.attachment)
      }

      const response = await this.http.request(`${this.endpoint}/${id}/`, {
        method: 'POST',
        body: formData,
        headers: {}
      })

      return {
        success: true,
        data: response
      }

    } catch (error) {
      console.error('Error updating leave application:', error)
      return {
        success: false,
        message: error.message || 'Failed to update leave application',
        details: error.data
      }
    }
  }

  /**
   * Delete leave application
   */
  async delete(id) {
    try {
      await this.http.delete(`${this.endpoint}/${id}/`)

      return {
        success: true,
        message: 'Leave application deleted successfully'
      }

    } catch (error) {
      console.error('Error deleting leave application:', error)
      return {
        success: false,
        message: error.message || 'Failed to delete leave application'
      }
    }
  }

  /**
   * Cancel leave application
   */
  async cancel(id, remarks) {
    try {
      const response = await this.http.post(`${this.endpoint}/${id}/cancel/`, {
        cancelled_remarks: remarks
      })

      return {
        success: true,
        data: response
      }

    } catch (error) {
      console.error('Error cancelling leave application:', error)
      return {
        success: false,
        message: error.message || 'Failed to cancel leave application'
      }
    }
  }

  /**
   * Export leave applications to CSV
   */
  async exportToCSV(params = {}) {
    try {
      const queryParams = new URLSearchParams()
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)
      if (params.search) queryParams.append('search', params.search)

      const queryString = queryParams.toString()
      const url = `${this.endpoint}/export/${queryString ? '?' + queryString : ''}`

      const response = await this.http.get(url)

      return {
        success: true,
        csv: response
      }

    } catch (error) {
      console.error('Error exporting leave applications:', error)
      return {
        success: false,
        message: error.message || 'Failed to export leave applications'
      }
    }
  }
}

// Create singleton instance
const leaveService = new LeaveService(httpClient)

export default leaveService
