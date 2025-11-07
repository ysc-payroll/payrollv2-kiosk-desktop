/**
 * Authentication Service
 * Handles user authentication, token management, and user info
 */

import httpClient from '../http-client.js'

class AuthService {
  constructor(http) {
    this.http = http
  }

  /**
   * Login user with email and password
   */
  async login(email, password) {
    try {
      const response = await this.http.request('/api/auth/login/', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email, password })
      })

      // Check response status
      if (response.status === 'success') {
        // API returns "access" and "refresh" not "access_token" and "refresh_token"
        const accessToken = response.jwt.access || response.jwt.access_token
        const refreshToken = response.jwt.refresh || response.jwt.refresh_token

        // Store tokens
        this.http.setTokens(accessToken, refreshToken)

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
   * Verify if token is valid
   */
  async verifyToken() {
    if (!this.http.accessToken) {
      return false
    }

    try {
      await this.http.request('/api/auth/token/verify/', {
        method: 'POST',
        skipAuth: true,
        skipRetry: true,
        body: JSON.stringify({ token: this.http.accessToken })
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
      await this.http.request('/api/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: this.http.refreshToken })
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.http.clearTokens()
    }
  }

  /**
   * Get current user information including company and employee data
   */
  async getUserInfo() {
    try {
      const response = await this.http.get('/api/auth/user/')

      console.log('🟡 Auth Service: Raw response from /api/auth/user/:', response)

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

      console.log('🟡 Auth Service: Mapped data:', mappedData)
      console.log('🟡 Auth Service: Company object after mapping:', mappedData.company)

      // Store complete user data
      localStorage.setItem('user_data', JSON.stringify(mappedData))

      // Store company data separately for easy access
      if (mappedData.company) {
        localStorage.setItem('company_data', JSON.stringify(mappedData.company))
        console.log('🟡 Auth Service: Stored company_data in localStorage:', mappedData.company)
      }

      return {
        success: true,
        data: mappedData
      }

    } catch (error) {
      console.error('❌ Auth Service: getUserInfo error:', error)
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
   * Get stored tokens
   */
  loadTokens() {
    return this.http.loadTokens()
  }

  /**
   * Clear all authentication data
   */
  clearTokens() {
    this.http.clearTokens()
  }
}

// Create singleton instance
const authService = new AuthService(httpClient)

export default authService
