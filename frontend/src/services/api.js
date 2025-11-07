/**
 * API Service Layer
 * Handles all HTTP requests to the backend API with JWT authentication
 */

const API_BASE_URL = 'https://theabbapayroll.com'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
    this.accessToken = null
    this.refreshToken = null
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken

    // Store in localStorage for persistence
    if (accessToken) localStorage.setItem('access_token', accessToken)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
  }

  /**
   * Get stored tokens from localStorage
   */
  loadTokens() {
    this.accessToken = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
  }

  /**
   * Make HTTP request with automatic token refresh on 401
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`

    // Default headers
    const headers = {
      ...options.headers
    }

    // Only set Content-Type if not FormData (browser will set it automatically for FormData with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    // Add Authorization header if access token exists
    if (this.accessToken && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    // Add custom headers to identify desktop app (for CORS security)
    headers['X-Timekeeper-Desktop'] = 'true'
    headers['X-App-Version'] = '2.0.0'
    // Secret token - change this periodically for security
    headers['X-App-Secret'] = 'tk-desktop-2024-secure-token'

    // Make request
    const config = {
      ...options,
      headers
    }

    try {
      const response = await fetch(url, config)

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !options.skipRetry && this.refreshToken) {
        console.log('Access token expired, attempting refresh...')
        const refreshed = await this.refreshAccessToken()

        if (refreshed) {
          // Retry original request with new token
          return this.request(endpoint, { ...options, skipRetry: true })
        } else {
          // Refresh failed, clear tokens and throw error
          this.clearTokens()
          throw new Error('Session expired. Please login again.')
        }
      }

      // Parse response
      const data = await response.json().catch(() => ({}))

      // Handle non-2xx responses
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.detail || data.message || 'An error occurred',
          data: data
        }
      }

      return data

    } catch (error) {
      // Re-throw structured errors
      if (error.status) {
        throw error
      }

      // Network or other errors
      throw {
        status: 0,
        message: error.message || 'Network error',
        data: null
      }
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await this.request('/api/auth/login/', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email, password })
      })

      // Check response status
      if (response.status === 'success') {
        // API returns "access" and "refresh" not "access_token" and "refresh_token"
        const accessToken = response.jwt.access || response.jwt.access_token;
        const refreshToken = response.jwt.refresh || response.jwt.refresh_token;

        // Store tokens
        this.setTokens(accessToken, refreshToken)

        // Store user data
        localStorage.setItem('user_data', JSON.stringify(response.jwt.user))

        return {
          success: true,
          user: response.jwt.user,
          hasAdminAccess: response.has_admin_portal_access,
          hasEmployeeAccess: response.has_employee_portal_access
        }
      } else if (response.status === 'otp_required') {
        return {
          success: false,
          requiresOTP: true,
          tempToken: response.temp_otp_token,
          message: response.detail
        }
      } else if (response.status === 'unverify_account') {
        return {
          success: false,
          unverified: true,
          message: response.detail
        }
      } else {
        return {
          success: false,
          message: response.detail || 'Login failed'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Invalid credentials'
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await this.request('/api/auth/token/refresh/', {
        method: 'POST',
        skipAuth: true,
        skipRetry: true,
        body: JSON.stringify({ refresh: this.refreshToken })
      })

      if (response.access) {
        this.setTokens(response.access, this.refreshToken)
        console.log('Access token refreshed successfully')
        return true
      }

      return false

    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  /**
   * Verify if token is valid
   */
  async verifyToken() {
    if (!this.accessToken) {
      return false
    }

    try {
      await this.request('/api/auth/token/verify/', {
        method: 'POST',
        skipAuth: true,
        skipRetry: true,
        body: JSON.stringify({ token: this.accessToken })
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.request('/api/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: this.refreshToken })
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearTokens()
    }
  }

  /**
   * Get current user information including company and employee data
   */
  async getUserInfo() {
    try {
      const response = await this.request('/api/auth/user/', {
        method: 'GET'
      })

      console.log('🟡 API Service: Raw response from /api/auth/user/:', response)

      // Map the actual API response structure to our expected format
      const mappedData = {
        id: response.id,
        email: response.email,
        first_name: response.first_name || '',
        last_name: response.last_name || '',
        is_superuser: response.is_superuser,
        is_staff: false, // Not in response, default to false

        // Map flat company fields to nested object
        company: {
          id: response.company_id,
          name: response.company_name
        },

        // Map employee_id (may be null)
        employee: response.employee_id ? {
          id: response.employee_id,
          system_id: response.employee_id // Use employee_id as system_id
        } : null,

        // Map rights to permissions format
        permissions: this._mapRightsToPermissions(response.rights || {}),

        // Map portal access
        admin_portal_access: response.has_admin_portal_access,
        employee_portal_access: response.has_employee_portal_access,
        portal_access_type: response.portal_access_type,
        can_switch_portals: response.can_switch_portals,

        // Store original rights for reference
        rights: response.rights,

        // Store original response for debugging
        _original: response
      }

      console.log('🟡 API Service: Mapped data:', mappedData)
      console.log('🟡 API Service: Company object after mapping:', mappedData.company)

      // Store complete user data
      localStorage.setItem('user_data', JSON.stringify(mappedData))

      // Store company data separately for easy access
      if (mappedData.company) {
        localStorage.setItem('company_data', JSON.stringify(mappedData.company))
        console.log('🟡 API Service: Stored company_data in localStorage:', mappedData.company)
      }

      return {
        success: true,
        data: mappedData
      }

    } catch (error) {
      console.error('❌ API Service: getUserInfo error:', error);
      return {
        success: false,
        message: error.message,
        data: null
      }
    }
  }

  /**
   * Map rights array format to permissions object format
   * Example: ["read", "write"] -> { read: true, write: true, delete: false, create: false, edit: false }
   */
  _mapRightsToPermissions(rights) {
    const permissions = {}

    // Iterate through each resource in rights
    for (const [resource, actions] of Object.entries(rights)) {
      // Create permission object for this resource
      permissions[resource] = {
        create: actions.includes('create'),
        read: actions.includes('read'),
        edit: actions.includes('edit'),
        delete: actions.includes('delete')
      }
    }

    return permissions
  }

  /**
   * Get employees for timekeeper (simplified endpoint)
   * Returns all active employees in flat array format
   */
  async getEmployeesTimekeeper() {
    try {
      const response = await this.request('/api/employees/timekeeper/', {
        method: 'GET'
      })

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
      const employeesResponse = await this.request('/api/employees/timekeeper/', {
        method: 'GET'
      })

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

  // ==================== TIMESHEET METHODS ====================

  /**
   * Create a timesheet entry on the backend
   */
  async createTimesheet(employeeId, date, logType, logTime) {
    try {
      const response = await this.request('/api/timesheets/', {
        method: 'POST',
        body: JSON.stringify({
          employee: employeeId,
          date: date,
          log_type: logType,
          log_time: logTime
        })
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

  /**
   * Get user data from localStorage
   */
  getUserData() {
    const userData = localStorage.getItem('user_data')
    return userData ? JSON.parse(userData) : null
  }

  /**
   * Get company data from localStorage
   */
  getCompanyData() {
    const companyData = localStorage.getItem('company_data')
    return companyData ? JSON.parse(companyData) : null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken || !!localStorage.getItem('access_token')
  }

  // ============================================================================
  // OVERTIME API METHODS
  // ============================================================================

  /**
   * Get overtime applications with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Records per page
   * @param {string} params.status - Filter by status (pending, approved, disapproved, cancelled, all)
   * @param {string} params.application_date - Filter by specific date (YYYY-MM-DD)
   * @param {string} params.application_date_from - Filter from date (YYYY-MM-DD)
   * @param {string} params.application_date_to - Filter to date (YYYY-MM-DD)
   * @param {number} params.employee - Filter by employee ID
   * @param {number} params.department - Filter by department ID
   * @param {number} params.position - Filter by position ID
   * @param {string} params.search - Search employee names
   */
  async getOvertimeApplications(params = {}) {
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
    const endpoint = `/api/applications/overtime/${queryString ? '?' + queryString : ''}`

    try {
      const response = await this.request(endpoint, {
        method: 'GET'
      })

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
   * Create new overtime application
   * @param {Object} data - Overtime application data
   * @param {number} data.employee - Employee ID
   * @param {string} data.application_date - Date of overtime work (YYYY-MM-DD)
   * @param {number} data.applied_time_hours - Hours requested
   * @param {number} data.applied_time_minutes - Minutes requested
   * @param {string} data.reason - Reason for overtime
   * @param {File} data.attachment - Optional file attachment (image only, max 10MB)
   */
  async createOvertimeApplication(data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('employee', data.employee)
      formData.append('application_date', data.application_date)
      formData.append('applied_time_hours', data.applied_time_hours || 0)
      formData.append('applied_time_minutes', data.applied_time_minutes || 0)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request('/api/applications/overtime/', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for multipart/form-data
        }
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
   * Get specific overtime application by ID
   * @param {number} id - Overtime application ID
   */
  async getOvertimeById(id) {
    try {
      const response = await this.request(`/api/applications/overtime/${id}/`, {
        method: 'GET'
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
   * Update overtime application (pending only)
   * @param {number} id - Overtime application ID
   * @param {Object} data - Updated data
   */
  async updateOvertimeApplication(id, data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      if (data.employee) formData.append('employee', data.employee)
      if (data.application_date) formData.append('application_date', data.application_date)
      if (data.applied_time_hours !== undefined) formData.append('applied_time_hours', data.applied_time_hours)
      if (data.applied_time_minutes !== undefined) formData.append('applied_time_minutes', data.applied_time_minutes)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request(`/api/applications/overtime/${id}/`, {
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
   * Delete overtime application (soft delete)
   * @param {number} id - Overtime application ID
   */
  async deleteOvertimeApplication(id) {
    try {
      await this.request(`/api/applications/overtime/${id}/`, {
        method: 'DELETE'
      })

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
   * @param {number} id - Overtime application ID
   * @param {string} remarks - Review remarks
   */
  async reviewOvertimeApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/overtime/${id}/review/`, {
        method: 'POST',
        body: JSON.stringify({ reviewed_remarks: remarks })
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
   * @param {number} id - Overtime application ID
   * @param {Object} data - Approval data
   * @param {number} data.approved_time_hours - Approved hours
   * @param {number} data.approved_time_minutes - Approved minutes
   * @param {string} data.approved_remarks - Approval remarks
   */
  async approveOvertimeApplication(id, data) {
    try {
      const response = await this.request(`/api/applications/overtime/${id}/approve/`, {
        method: 'POST',
        body: JSON.stringify({
          approved_time_hours: data.approved_time_hours || 0,
          approved_time_minutes: data.approved_time_minutes || 0,
          approved_remarks: data.approved_remarks
        })
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
   * @param {number} id - Overtime application ID
   * @param {string} remarks - Disapproval remarks
   */
  async disapproveOvertimeApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/overtime/${id}/disapprove/`, {
        method: 'POST',
        body: JSON.stringify({ disapproved_remarks: remarks })
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
   * @param {number} id - Overtime application ID
   * @param {string} remarks - Cancellation remarks
   */
  async cancelOvertimeApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/overtime/${id}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ cancelled_remarks: remarks })
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
   * @param {number} id - Overtime application ID
   */
  async getOvertimeAttachment(id) {
    try {
      const url = `${this.baseURL}/api/applications/overtime/${id}/attachment/`

      console.log('[Attachment] Fetching attachment for ID:', id)
      console.log('[Attachment] Request URL:', url)

      // Try method 1: Let the browser follow redirects automatically
      try {
        console.log('[Attachment] Method 1: Automatic redirect following')
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
          // redirect: 'follow' is the default
        })

        console.log('[Attachment] Response status:', response.status)
        console.log('[Attachment] Response URL:', response.url)
        console.log('[Attachment] Response headers:', Array.from(response.headers.entries()))

        if (response.ok) {
          const blob = await response.blob()
          console.log('[Attachment] Blob size:', blob.size, 'type:', blob.type)

          const contentType = response.headers.get('content-type')
          const contentDisposition = response.headers.get('content-disposition')

          let filename = 'attachment'
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '')
            }
          }

          console.log('[Attachment] Success! Filename:', filename)
          return {
            success: true,
            blob,
            contentType,
            filename
          }
        }
      } catch (error) {
        console.log('[Attachment] Method 1 failed:', error.message)
      }

      // Method 2: Manual redirect handling
      console.log('[Attachment] Method 2: Manual redirect handling')
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        redirect: 'manual'
      })

      console.log('[Attachment] Manual response status:', response.status)
      console.log('[Attachment] Manual response type:', response.type)

      // Check if we got a redirect (302/301)
      if (response.status === 302 || response.status === 301 || response.type === 'opaqueredirect') {
        let redirectUrl = response.headers.get('Location')
        console.log('[Attachment] Redirect URL from header:', redirectUrl)

        // If Location header is not available, try to get the URL from the response
        if (!redirectUrl && response.url) {
          redirectUrl = response.url
          console.log('[Attachment] Using response.url as redirect:', redirectUrl)
        }

        if (redirectUrl) {
          // Fetch from the redirect URL WITHOUT Authorization header
          console.log('[Attachment] Fetching from redirect URL...')
          const fileResponse = await fetch(redirectUrl, {
            method: 'GET'
            // No Authorization header for MinIO
          })

          console.log('[Attachment] Redirect response status:', fileResponse.status)
          console.log('[Attachment] Redirect response ok:', fileResponse.ok)

          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch attachment from storage: ${fileResponse.status}`)
          }

          const blob = await fileResponse.blob()
          console.log('[Attachment] Blob size:', blob.size, 'type:', blob.type)

          const contentType = fileResponse.headers.get('content-type')
          const contentDisposition = fileResponse.headers.get('content-disposition')

          let filename = 'attachment'
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '')
            }
          }

          console.log('[Attachment] Success with manual redirect! Filename:', filename)
          return {
            success: true,
            blob,
            contentType,
            filename
          }
        } else {
          console.error('[Attachment] No redirect URL available')
          throw new Error('Redirect URL not found in Location header or response.url')
        }
      }

      // If not redirected and not OK, throw error
      throw new Error(`Unexpected response status: ${response.status}`)

    } catch (error) {
      console.error('[Attachment] Fetch error:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch attachment'
      }
    }
  }

  /**
   * Get overtime attachment metadata
   * @param {number} id - Overtime application ID
   */
  async getOvertimeAttachmentInfo(id) {
    try {
      const response = await this.request(`/api/applications/overtime/${id}/attachment/info/`, {
        method: 'GET'
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
   * Replace/upload overtime attachment
   * @param {number} id - Overtime application ID
   * @param {File} file - New attachment file
   */
  async replaceOvertimeAttachment(id, file) {
    try {
      const formData = new FormData()
      formData.append('attachment', file)

      const response = await this.request(`/api/applications/overtime/${id}/attachment/replace/`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type with boundary
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
   * Export overtime applications to CSV
   * @param {Object} params - Same filter params as getOvertimeApplications
   */
  async exportOvertimeToCSV(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.application_date) queryParams.append('application_date', params.application_date)
    if (params.application_date_from) queryParams.append('application_date_from', params.application_date_from)
    if (params.application_date_to) queryParams.append('application_date_to', params.application_date_to)
    if (params.employee) queryParams.append('employee', params.employee)
    if (params.department) queryParams.append('department', params.department)
    if (params.position) queryParams.append('position', params.position)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const endpoint = `/api/applications/overtime/export/${queryString ? '?' + queryString : ''}`

    try {
      // Step 1: Get the pre-signed URL from the API
      const url = `${this.baseURL}${endpoint}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the response text (which is the pre-signed URL)
      const presignedUrl = await response.text()

      // Step 2: Fetch the actual CSV content from the pre-signed URL
      const csvResponse = await fetch(presignedUrl)

      if (!csvResponse.ok) {
        throw new Error('Failed to download CSV from storage')
      }

      const csvContent = await csvResponse.text()

      // Default filename with current date
      const defaultFilename = `overtime_export_${new Date().toISOString().split('T')[0]}.csv`

      // Check if PyQt bridge is available
      if (window.kioskBridge && window.kioskBridge.saveFileDialog) {
        // Use PyQt file dialog
        const result = await window.kioskBridge.saveFileDialog(csvContent, defaultFilename)
        const data = JSON.parse(result)

        if (data.success) {
          return {
            success: true,
            message: data.message
          }
        } else if (data.cancelled) {
          return {
            success: false,
            message: 'Export cancelled',
            cancelled: true
          }
        } else {
          throw new Error(data.message || 'Failed to save file')
        }
      } else {
        // Fallback: Use browser download (for web version)
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = defaultFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        return {
          success: true,
          message: 'Export completed successfully'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Export failed'
      }
    }
  }

  // ============================================================================
  // HOLIDAY API METHODS
  // ============================================================================

  /**
   * Get holiday applications with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Records per page
   * @param {string} params.status - Filter by status (pending, approved, disapproved, cancelled, all)
   * @param {string} params.application_date - Filter by specific date (YYYY-MM-DD)
   * @param {string} params.application_date_from - Filter from date (YYYY-MM-DD)
   * @param {string} params.application_date_to - Filter to date (YYYY-MM-DD)
   * @param {number} params.employee - Filter by employee ID
   * @param {number} params.department - Filter by department ID
   * @param {number} params.position - Filter by position ID
   * @param {string} params.search - Search employee names
   */
  async getHolidayApplications(params = {}) {
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
    const endpoint = `/api/applications/holiday/${queryString ? '?' + queryString : ''}`

    try {
      const response = await this.request(endpoint, {
        method: 'GET'
      })

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
   * Create new holiday application
   * @param {Object} data - Holiday application data
   * @param {number} data.employee - Employee ID
   * @param {string} data.application_date - Date of holiday work (YYYY-MM-DD)
   * @param {number} data.applied_time_hours - Hours requested
   * @param {number} data.applied_time_minutes - Minutes requested
   * @param {string} data.reason - Reason for holiday work
   * @param {File} data.attachment - Optional file attachment (image only, max 10MB)
   */
  async createHolidayApplication(data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('employee', data.employee)
      formData.append('application_date', data.application_date)
      formData.append('applied_time_hours', data.applied_time_hours || 0)
      formData.append('applied_time_minutes', data.applied_time_minutes || 0)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request('/api/applications/holiday/', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for multipart/form-data
        }
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
   * Get specific holiday application by ID
   * @param {number} id - Holiday application ID
   */
  async getHolidayById(id) {
    try {
      const response = await this.request(`/api/applications/holiday/${id}/`, {
        method: 'GET'
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
   * Update holiday application (pending only)
   * @param {number} id - Holiday application ID
   * @param {Object} data - Updated data
   */
  async updateHolidayApplication(id, data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      if (data.employee) formData.append('employee', data.employee)
      if (data.application_date) formData.append('application_date', data.application_date)
      if (data.applied_time_hours !== undefined) formData.append('applied_time_hours', data.applied_time_hours)
      if (data.applied_time_minutes !== undefined) formData.append('applied_time_minutes', data.applied_time_minutes)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request(`/api/applications/holiday/${id}/`, {
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
   * Delete holiday application (soft delete)
   * @param {number} id - Holiday application ID
   */
  async deleteHolidayApplication(id) {
    try {
      await this.request(`/api/applications/holiday/${id}/`, {
        method: 'DELETE'
      })

      return {
        success: true,
        message: 'Holiday application deleted successfully'
      }

    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Cancel holiday application
   * @param {number} id - Holiday application ID
   * @param {string} remarks - Cancellation remarks
   */
  async cancelHolidayApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/holiday/${id}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ cancelled_remarks: remarks })
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
   * Export holiday applications to CSV
   * @param {Object} params - Same filter params as getHolidayApplications
   */
  async exportHolidayToCSV(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.application_date) queryParams.append('application_date', params.application_date)
    if (params.application_date_from) queryParams.append('application_date_from', params.application_date_from)
    if (params.application_date_to) queryParams.append('application_date_to', params.application_date_to)
    if (params.employee) queryParams.append('employee', params.employee)
    if (params.department) queryParams.append('department', params.department)
    if (params.position) queryParams.append('position', params.position)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const endpoint = `/api/applications/holiday/export/${queryString ? '?' + queryString : ''}`

    try {
      // Step 1: Get the pre-signed URL from the API
      const url = `${this.baseURL}${endpoint}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the response text (which is the pre-signed URL)
      const presignedUrl = await response.text()

      // Step 2: Fetch the actual CSV content from the pre-signed URL
      const csvResponse = await fetch(presignedUrl)

      if (!csvResponse.ok) {
        throw new Error('Failed to download CSV from storage')
      }

      const csvContent = await csvResponse.text()

      // Default filename with current date
      const defaultFilename = `holiday_export_${new Date().toISOString().split('T')[0]}.csv`

      // Check if PyQt bridge is available
      if (window.kioskBridge && window.kioskBridge.saveFileDialog) {
        // Use PyQt file dialog
        const result = await window.kioskBridge.saveFileDialog(csvContent, defaultFilename)
        const data = JSON.parse(result)

        if (data.success) {
          return {
            success: true,
            message: data.message
          }
        } else if (data.cancelled) {
          return {
            success: false,
            message: 'Export cancelled',
            cancelled: true
          }
        } else {
          throw new Error(data.message || 'Failed to save file')
        }
      } else {
        // Fallback: Use browser download (for web version)
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = defaultFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        return {
          success: true,
          message: 'Export completed successfully'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Export failed'
      }
    }
  }

  // ==================== Restday API Methods ====================

  // Get restday applications with filters
  async getRestdayApplications(params = {}) {
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
    const endpoint = `/api/applications/restday/${queryString ? '?' + queryString : ''}`

    try {
      const response = await this.request(endpoint, {
        method: 'GET'
      })

      return {
        success: true,
        data: response.data || [],
        totalRecords: response.total_records || 0,
        totalPages: response.total_pages || 1,
        currentPage: response.current_page || 1
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch restday applications',
        data: []
      }
    }
  }

  // Get restday by ID
  async getRestdayById(id) {
    try {
      const response = await this.request(`/api/applications/restday/${id}/`, {
        method: 'GET'
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

  // Create restday application
  async createRestdayApplication(data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('employee', data.employee)
      formData.append('application_date', data.application_date)
      formData.append('applied_time_hours', data.applied_time_hours || 0)
      formData.append('applied_time_minutes', data.applied_time_minutes || 0)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request('/api/applications/restday/', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for multipart/form-data
        }
      })

      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create restday application',
        details: error.details
      }
    }
  }

  // Update restday application
  async updateRestdayApplication(id, data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      if (data.employee) formData.append('employee', data.employee)
      if (data.application_date) formData.append('application_date', data.application_date)
      if (data.applied_time_hours !== undefined) formData.append('applied_time_hours', data.applied_time_hours)
      if (data.applied_time_minutes !== undefined) formData.append('applied_time_minutes', data.applied_time_minutes)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request(`/api/applications/restday/${id}/`, {
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
        message: error.message || 'Failed to update restday application',
        details: error.details
      }
    }
  }

  // Delete restday application (soft delete)
  async deleteRestdayApplication(id) {
    try {
      await this.request(`/api/applications/restday/${id}/`, {
        method: 'DELETE'
      })

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

  // Cancel restday application
  async cancelRestdayApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/restday/${id}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ cancelled_remarks: remarks })
      })

      return {
        success: true,
        data: response
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to cancel restday application'
      }
    }
  }

  // Export restday to CSV
  async exportRestdayToCSV(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.application_date) queryParams.append('application_date', params.application_date)
    if (params.application_date_from) queryParams.append('application_date_from', params.application_date_from)
    if (params.application_date_to) queryParams.append('application_date_to', params.application_date_to)
    if (params.employee) queryParams.append('employee', params.employee)
    if (params.department) queryParams.append('department', params.department)
    if (params.position) queryParams.append('position', params.position)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const endpoint = `/api/applications/restday/export/${queryString ? '?' + queryString : ''}`

    try {
      // Step 1: Get the pre-signed URL from the API
      const url = `${this.baseURL}${endpoint}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to initiate export')
      }

      // Step 2: Get the CSV content from the pre-signed URL
      const data = await response.json()
      const csvUrl = data.url

      const csvResponse = await fetch(csvUrl)
      if (!csvResponse.ok) {
        throw new Error('Failed to download CSV file')
      }

      const csvContent = await csvResponse.text()

      // Default filename with current date
      const defaultFilename = `restday_export_${new Date().toISOString().split('T')[0]}.csv`

      // Check if PyQt bridge is available
      if (window.kioskBridge && window.kioskBridge.saveFileDialog) {
        // Use PyQt file dialog
        const result = await window.kioskBridge.saveFileDialog(csvContent, defaultFilename)
        const data = JSON.parse(result)

        if (data.success) {
          return {
            success: true,
            message: data.message
          }
        } else if (data.cancelled) {
          return {
            success: false,
            message: 'Export cancelled',
            cancelled: true
          }
        } else {
          throw new Error(data.message || 'Failed to save file')
        }
      } else {
        // Fallback: Use browser download (for web version)
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = defaultFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        return {
          success: true,
          message: 'Export completed successfully'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Export failed'
      }
    }
  }

  // ==================== Undertime API Methods ====================

  // Get undertime applications with filters
  async getUndertimeApplications(params = {}) {
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
    const endpoint = `/api/applications/undertime/${queryString ? '?' + queryString : ''}`

    try {
      const response = await this.request(endpoint, {
        method: 'GET'
      })

      return {
        success: true,
        data: response.data || [],
        totalRecords: response.total_records || 0,
        totalPages: response.total_pages || 1,
        currentPage: response.current_page || 1
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch undertime applications',
        data: []
      }
    }
  }

  // Get undertime by ID
  async getUndertimeById(id) {
    try {
      const response = await this.request(`/api/applications/undertime/${id}/`, {
        method: 'GET'
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

  // Create undertime application
  async createUndertimeApplication(data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('employee', data.employee)
      formData.append('application_date', data.application_date)
      formData.append('applied_time_hours', data.applied_time_hours || 0)
      formData.append('applied_time_minutes', data.applied_time_minutes || 0)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request('/api/applications/undertime/', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for multipart/form-data
        }
      })

      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create undertime application',
        details: error.details
      }
    }
  }

  // Update undertime application
  async updateUndertimeApplication(id, data) {
    try {
      // Use FormData for file upload
      const formData = new FormData()
      if (data.employee) formData.append('employee', data.employee)
      if (data.application_date) formData.append('application_date', data.application_date)
      if (data.applied_time_hours !== undefined) formData.append('applied_time_hours', data.applied_time_hours)
      if (data.applied_time_minutes !== undefined) formData.append('applied_time_minutes', data.applied_time_minutes)
      if (data.reason) formData.append('reason', data.reason)
      if (data.attachment) formData.append('attachment', data.attachment)

      const response = await this.request(`/api/applications/undertime/${id}/`, {
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
        message: error.message || 'Failed to update undertime application',
        details: error.details
      }
    }
  }

  // Delete undertime application (soft delete)
  async deleteUndertimeApplication(id) {
    try {
      await this.request(`/api/applications/undertime/${id}/`, {
        method: 'DELETE'
      })

      return {
        success: true,
        message: 'Undertime application deleted successfully'
      }

    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Cancel undertime application
  async cancelUndertimeApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/undertime/${id}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ cancelled_remarks: remarks })
      })

      return {
        success: true,
        data: response
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to cancel undertime application'
      }
    }
  }

  // Export undertime to CSV
  async exportUndertimeToCSV(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.application_date) queryParams.append('application_date', params.application_date)
    if (params.application_date_from) queryParams.append('application_date_from', params.application_date_from)
    if (params.application_date_to) queryParams.append('application_date_to', params.application_date_to)
    if (params.employee) queryParams.append('employee', params.employee)
    if (params.department) queryParams.append('department', params.department)
    if (params.position) queryParams.append('position', params.position)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const endpoint = `/api/applications/undertime/export/${queryString ? '?' + queryString : ''}`

    try {
      // Step 1: Get the pre-signed URL from the API
      const url = `${this.baseURL}${endpoint}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to initiate export')
      }

      // Step 2: Get the CSV content from the pre-signed URL
      const data = await response.json()
      const csvUrl = data.url

      const csvResponse = await fetch(csvUrl)
      if (!csvResponse.ok) {
        throw new Error('Failed to download CSV file')
      }

      const csvContent = await csvResponse.text()

      // Default filename with current date
      const defaultFilename = `undertime_export_${new Date().toISOString().split('T')[0]}.csv`

      // Check if PyQt bridge is available
      if (window.kioskBridge && window.kioskBridge.saveFileDialog) {
        // Use PyQt file dialog
        const result = await window.kioskBridge.saveFileDialog(csvContent, defaultFilename)
        const data = JSON.parse(result)

        if (data.success) {
          return {
            success: true,
            message: data.message
          }
        } else if (data.cancelled) {
          return {
            success: false,
            message: 'Export cancelled',
            cancelled: true
          }
        } else {
          throw new Error(data.message || 'Failed to save file')
        }
      } else {
        // Fallback: Use browser download (for web version)
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = defaultFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        return {
          success: true,
          message: 'Export completed successfully'
        }
      }

    } catch (error) {
      return {
        success: false,
        message: error.message || 'Export failed'
      }
    }
  }

  // ========================================
  // Leave Applications
  // ========================================

  /**
   * Get leave types dropdown
   * @returns {Promise} Response with leave types
   */
  async getLeaveTypes() {
    try {
      const response = await this.request('/api/misc/leave_types/dropdown/', {
        method: 'GET'
      })

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
   * @param {Object} params - Query parameters (page, limit, status, date_from, date_to, search)
   * @returns {Promise} Response with leave applications
   */
  async getLeaveApplications(params = {}) {
    try {
      // Build query string
      const queryParams = new URLSearchParams()

      if (params.page) queryParams.append('current_page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.status && params.status !== 'all') queryParams.append('status', params.status)
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)
      if (params.search) queryParams.append('search', params.search)

      const endpoint = `/api/applications/leave/?${queryParams.toString()}`

      const response = await this.request(endpoint, {
        method: 'GET'
      })

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
   * @param {number} id - Leave application ID
   * @returns {Promise} Response with leave application data
   */
  async getLeaveById(id) {
    try {
      const response = await this.request(`/api/applications/leave/${id}/`, {
        method: 'GET'
      })

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
   * @param {Object} data - Leave application data
   * @returns {Promise} Response with created leave application
   */
  async createLeaveApplication(data) {
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

      const response = await this.request('/api/applications/leave/', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type with boundary
      })

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
   * Update existing leave application
   * @param {number} id - Leave application ID
   * @param {Object} data - Updated leave application data
   * @returns {Promise} Response with updated leave application
   */
  async updateLeaveApplication(id, data) {
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

      const response = await this.request(`/api/applications/leave/${id}/`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type with boundary
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
   * Delete leave application (soft delete)
   * @param {number} id - Leave application ID
   * @returns {Promise} Response with success status
   */
  async deleteLeaveApplication(id) {
    try {
      await this.request(`/api/applications/leave/${id}/`, {
        method: 'DELETE'
      })

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
   * @param {number} id - Leave application ID
   * @param {string} remarks - Cancellation remarks
   * @returns {Promise} Response with success status
   */
  async cancelLeaveApplication(id, remarks) {
    try {
      const response = await this.request(`/api/applications/leave/${id}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ cancelled_remarks: remarks })
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
   * @param {Object} filters - Filter parameters (status, date_from, date_to, search)
   * @returns {Promise} Response with success status
   */
  async exportLeaveToCSV(filters = {}) {
    try {
      // Build query string
      const queryParams = new URLSearchParams()

      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.date_from) queryParams.append('date_from', filters.date_from)
      if (filters.date_to) queryParams.append('date_to', filters.date_to)
      if (filters.search) queryParams.append('search', filters.search)

      const endpoint = `/api/applications/leave/export/?${queryParams.toString()}`

      const response = await this.request(endpoint, {
        method: 'GET'
      })

      if (response.success && response.data?.url) {
        // Download the file from the pre-signed URL
        const fileResponse = await fetch(response.data.url)

        if (!fileResponse.ok) {
          throw new Error('Failed to download file')
        }

        const blob = await fileResponse.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = response.data.filename || `leave_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        return {
          success: true,
          message: 'Export completed successfully'
        }
      }

      return {
        success: false,
        message: response.message || 'Export failed'
      }
    } catch (error) {
      console.error('Error exporting leave applications:', error)
      return {
        success: false,
        message: error.message || 'Export failed'
      }
    }
  }
}

// Export singleton instance
export default new ApiService()
