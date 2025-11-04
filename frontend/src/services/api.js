/**
 * API Service Layer
 * Handles all HTTP requests to the backend API with JWT authentication
 */

const API_BASE_URL = 'http://localhost:8000'

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
      'Content-Type': 'application/json',
      ...options.headers
    }

    // Add Authorization header if access token exists
    if (this.accessToken && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

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
   * Get employee list with pagination and filters
   */
  async getEmployees(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.department) queryParams.append('department', params.department)
    if (params.position) queryParams.append('position', params.position)
    if (params.division) queryParams.append('division', params.division)
    if (params.employmenttype) queryParams.append('employmenttype', params.employmenttype)
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active)

    const queryString = queryParams.toString()
    const endpoint = `/api/employees/${queryString ? '?' + queryString : ''}`

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
}

// Export singleton instance
export default new ApiService()
