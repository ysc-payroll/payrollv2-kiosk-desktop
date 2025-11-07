/**
 * Restday Service
 * Handles restday application CRUD operations
 */

import httpClient from '../http-client.js'
import { BaseCrudService } from './base.service.js'

class RestdayService extends BaseCrudService {
  constructor(http) {
    super(http, '/api/applications/restday')
    this.http = http
  }

  /**
   * Get restday applications with pagination and filters
   */
  async getAll(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('current_page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.status) queryParams.append('status', params.status)
    if (params.application_date) queryParams.append('application_date', params.application_date)
    if (params.application_date_from) queryParams.append('date_from', params.application_date_from)
    if (params.application_date_to) queryParams.append('application_date_to', params.application_date_to)
    if (params.employee) queryParams.append('employee', params.employee)
    if (params.department) queryParams.append('department', params.department)
    if (params.position) queryParams.append('position', params.position)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const endpoint = `${this.endpoint}/${queryString ? '?' + queryString : ''}`

    try {
      const response = await this.http.get(endpoint)

      return {
        success: true,
        data: response.data,
        totalRecords: response.total_records,
        currentPage: response.current_page,
        totalPages: response.total_pages,
        limit: response.limit
      }

    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: []
      }
    }
  }

  /**
   * Create new restday application
   */
  async create(data) {
    try {
      const response = await this.http.post(`${this.endpoint}/`, {
        employee: data.employee,
        application_date: data.application_date,
        reason: data.reason
      })

      return {
        success: true,
        data: response
      }

    } catch (error) {
      return {
        success: false,
        message: error.message,
        details: error.data
      }
    }
  }

  /**
   * Update restday application
   */
  async update(id, data) {
    try {
      const response = await this.http.patch(`${this.endpoint}/${id}/`, {
        employee: data.employee,
        application_date: data.application_date,
        reason: data.reason
      })

      return {
        success: true,
        data: response
      }

    } catch (error) {
      return {
        success: false,
        message: error.message,
        details: error.data
      }
    }
  }

  /**
   * Delete restday application
   */
  async delete(id) {
    try {
      await this.http.delete(`${this.endpoint}/${id}/`)

      return {
        success: true,
        message: 'Restday application deleted successfully'
      }

    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Cancel restday application
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
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Export restday applications to CSV
   */
  async exportToCSV(params = {}) {
    try {
      const queryParams = new URLSearchParams()
      if (params.status) queryParams.append('status', params.status)
      if (params.application_date_from) queryParams.append('date_from', params.application_date_from)
      if (params.application_date_to) queryParams.append('application_date_to', params.application_date_to)
      if (params.employee) queryParams.append('employee', params.employee)
      if (params.department) queryParams.append('department', params.department)

      const queryString = queryParams.toString()
      const url = `${this.endpoint}/export/${queryString ? '?' + queryString : ''}`

      const response = await this.http.get(url)

      return {
        success: true,
        csv: response
      }

    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }
}

// Create singleton instance
const restdayService = new RestdayService(httpClient)

export default restdayService
