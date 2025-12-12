/**
 * HTTP Client
 * Handles HTTP requests with JWT authentication, token refresh, and custom headers
 */

import errorHandler from './errorHandler.js'

const API_BASE_URL = 'https://api.theabbapayroll.com'
// const API_BASE_URL = 'http://localhost:8000'

class HttpClient {
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

    // Add custom desktop app headers
    headers['X-Timekeeper-Desktop'] = 'true'
    headers['X-App-Version'] = '2.0.1'
    headers['X-App-Secret'] = '0PyX2b4ATZ8A73BDbfA6QENRant-pBylVML6QO6fBc0'

    // Make request
    const config = {
      ...options,
      headers
    }

    try {
      const response = await fetch(url, config)

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !options.skipRetry && this.refreshToken) {
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

      // Handle non-2xx responses first
      if (!response.ok) {
        // Let errorHandler parse the response
        const errorObj = await errorHandler.parseHttpResponse(response)

        // Log error for debugging (don't show toast here, let services handle it)
        errorHandler.handle(errorObj, {
          context: `HTTP ${options.method || 'GET'} ${endpoint}`,
          operation: 'http_request',
          showToast: false // Services will handle toast notifications
        })

        throw errorObj
      }

      // Parse successful response
      const data = await response.json().catch(() => ({}))
      return data

    } catch (error) {
      // Re-throw structured errors
      if (error.status) {
        throw error
      }

      // Network or other errors
      const networkError = {
        status: 0,
        message: error.message || 'Network error',
        data: null
      }

      // Log network error
      errorHandler.handle(networkError, {
        context: `HTTP ${options.method || 'GET'} ${endpoint}`,
        operation: 'http_request',
        showToast: false
      })

      throw networkError
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
        return true
      }

      return false

    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    })
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data)
    })
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data)
    })
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create singleton instance
const httpClient = new HttpClient()

// Load tokens on initialization
httpClient.loadTokens()

export default httpClient
