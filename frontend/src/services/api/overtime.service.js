/**
 * Overtime Service
 * Handles overtime application CRUD and approval operations
 */

import httpClient from '../http-client.js'
import { BaseCrudService } from './base.service.js'

class OvertimeService extends BaseCrudService {
  constructor(http) {
    super(http, '/api/applications/overtime')
    this.http = http
  }

  /**
   * Get overtime applications with pagination and filters (override base method)
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
   * Create new overtime application (override to use FormData)
   */
  async create(data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('employee', data.employee)
      formData.append('application_date', data.application_date)
      formData.append('applied_time_hours', data.applied_time_hours || 0)
      formData.append('applied_time_minutes', data.applied_time_minutes || 0)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.http.post(`${this.endpoint}/`, formData)

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
   * Update overtime application (override to use FormData)
   */
  async update(id, data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      if (data.employee) formData.append('employee', data.employee)
      if (data.application_date) formData.append('application_date', data.application_date)
      if (data.applied_time_hours !== undefined) formData.append('applied_time_hours', data.applied_time_hours)
      if (data.applied_time_minutes !== undefined) formData.append('applied_time_minutes', data.applied_time_minutes)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

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
      return {
        success: false,
        message: error.message,
        details: error.data
      }
    }
  }

  /**
   * Delete overtime application
   */
  async delete(id) {
    try {
      await this.http.delete(`${this.endpoint}/${id}/`)

      return {
        success: true,
        message: 'Overtime application deleted successfully'
      }

    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Mark overtime application as reviewed
   */
  async review(id, remarks) {
    try {
      const response = await this.http.post(`${this.endpoint}/${id}/review/`, {
        reviewed_remarks: remarks
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
   * Approve overtime application
   */
  async approve(id, data) {
    try {
      const response = await this.http.post(`${this.endpoint}/${id}/approve/`, {
        approved_time_hours: data.approved_time_hours || 0,
        approved_time_minutes: data.approved_time_minutes || 0,
        approved_remarks: data.approved_remarks
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
   * Disapprove overtime application
   */
  async disapprove(id, remarks) {
    try {
      const response = await this.http.post(`${this.endpoint}/${id}/disapprove/`, {
        disapproved_remarks: remarks
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
   * Cancel overtime application
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
   * Get overtime attachment file (download)
   */
  async getAttachment(id) {
    try {
      const url = `${this.http.baseURL}${this.endpoint}/${id}/attachment/`

      console.log('[Attachment] Fetching attachment for ID:', id)
      console.log('[Attachment] Request URL:', url)

      // Try method 1: Let the browser follow redirects automatically
      try {
        console.log('[Attachment] Method 1: Automatic redirect following')
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.http.accessToken}`
          }
          // redirect: 'follow' is the default
        })

        console.log('[Attachment] Response status:', response.status)
        console.log('[Attachment] Response URL:', response.url)

        if (response.ok) {
          const blob = await response.blob()
          const contentType = response.headers.get('content-type')
          const contentDisposition = response.headers.get('content-disposition')

          let filename = `attachment_${id}`
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+?)"?$/)
            if (match) filename = match[1]
          }

          return {
            success: true,
            blob: blob,
            filename: filename,
            contentType: contentType
          }
        } else {
          throw new Error(`HTTP ${response.status}`)
        }

      } catch (fetchError) {
        console.error('[Attachment] Method 1 failed:', fetchError)
        throw fetchError
      }

    } catch (error) {
      console.error('[Attachment] All methods failed:', error)
      return {
        success: false,
        message: error.message || 'Failed to download attachment'
      }
    }
  }

  /**
   * Get overtime attachment info
   */
  async getAttachmentInfo(id) {
    try {
      const response = await this.http.get(`${this.endpoint}/${id}/attachment/info/`)

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
   * Replace overtime attachment
   */
  async replaceAttachment(id, file) {
    try {
      const formData = new FormData()
      formData.append('attachment', file)

      const response = await this.http.post(`${this.endpoint}/${id}/attachment/replace/`, formData)

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
   * Export overtime applications to CSV
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
const overtimeService = new OvertimeService(httpClient)

export default overtimeService
