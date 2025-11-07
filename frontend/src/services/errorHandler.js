/**
 * Centralized Error Handler Service
 * Manages all HTTP error responses, status codes, and error formatting
 */

import { useToast } from '../composables/useToast.js'

class ErrorHandler {
  constructor() {
    this.toast = null
    this.errorLog = []
    this.maxLogSize = 100
  }

  /**
   * Initialize toast notifications
   */
  initToast() {
    if (!this.toast) {
      this.toast = useToast()
    }
  }

  /**
   * HTTP Status Code Messages
   */
  getStatusMessage(status) {
    const statusMessages = {
      // 4xx Client Errors
      400: 'Bad Request - Invalid data submitted',
      401: 'Unauthorized - Please login again',
      403: 'Forbidden - You don\'t have permission to perform this action',
      404: 'Not Found - The requested resource was not found',
      405: 'Method Not Allowed',
      408: 'Request Timeout - Please try again',
      409: 'Conflict - This resource already exists or conflicts with existing data',
      413: 'File Too Large - Please upload a smaller file',
      422: 'Validation Error - Please check your input',
      429: 'Too Many Requests - Please slow down',

      // 5xx Server Errors
      500: 'Internal Server Error - Something went wrong on our end',
      502: 'Bad Gateway - Server is temporarily unavailable',
      503: 'Service Unavailable - Server is under maintenance',
      504: 'Gateway Timeout - Request took too long',

      // Network Errors
      0: 'Network Error - Please check your internet connection'
    }

    return statusMessages[status] || `Error ${status} - An unexpected error occurred`
  }

  /**
   * Get error category based on status code
   */
  getErrorCategory(status) {
    if (status === 0) return 'network'
    if (status >= 400 && status < 500) return 'client'
    if (status >= 500) return 'server'
    return 'unknown'
  }

  /**
   * Get error severity
   */
  getErrorSeverity(status) {
    // Critical: Server errors, auth errors
    if (status >= 500 || status === 401 || status === 403) return 'critical'
    // High: Not found, validation errors
    if (status === 404 || status === 422 || status === 409) return 'high'
    // Medium: Other client errors
    if (status >= 400 && status < 500) return 'medium'
    // Low: Network issues (usually temporary)
    if (status === 0) return 'low'
    return 'medium'
  }

  /**
   * Parse HTTP Response for errors
   * Handles both JSON and plain text error responses
   */
  async parseHttpResponse(response) {
    if (!response || response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    let data
    let errorMessage

    try {
      if (contentType.includes('application/json')) {
        // JSON response
        data = await response.json()

        // If data is a plain string, use it directly
        if (typeof data === 'string') {
          errorMessage = data
          data = { detail: data }
        } else {
          // If data is an object, extract error message
          errorMessage = data.detail || data.message || data.error || null
        }
      } else {
        // Plain text or other response
        const textResponse = await response.text()
        errorMessage = textResponse
        data = { detail: textResponse }
      }
    } catch (parseError) {
      // Fallback: try to get any text
      try {
        const textResponse = await response.text()
        errorMessage = textResponse
        data = { detail: textResponse }
      } catch {
        errorMessage = null
        data = {}
      }
    }

    // If no message extracted, use status-based message
    if (!errorMessage) {
      errorMessage = this.getStatusMessage(response.status)
    }

    // Return with 'details' to match parseError expectations
    return {
      status: response.status,
      message: errorMessage,
      details: data,  // Changed from 'data' to 'details'
      category: this.getErrorCategory(response.status),
      severity: this.getErrorSeverity(response.status)
    }
  }

  /**
   * Parse error from various sources
   */
  parseError(error) {
    // Already structured error from http-client
    if (error.status !== undefined) {
      return {
        status: error.status,
        message: error.message,
        details: error.data,
        category: this.getErrorCategory(error.status),
        severity: this.getErrorSeverity(error.status)
      }
    }

    // Standard Error object
    if (error instanceof Error) {
      return {
        status: 0,
        message: error.message,
        details: null,
        category: 'network',
        severity: 'low'
      }
    }

    // String error
    if (typeof error === 'string') {
      return {
        status: 0,
        message: error,
        details: null,
        category: 'unknown',
        severity: 'medium'
      }
    }

    // Unknown error format
    return {
      status: 0,
      message: 'An unexpected error occurred',
      details: error,
      category: 'unknown',
      severity: 'medium'
    }
  }

  /**
   * Format user-friendly error message
   */
  formatUserMessage(parsedError, context = '') {
    const { status, message, details } = parsedError

    // Use specific error messages from server if available
    if (details) {
      // Plain string error (like plain text responses)
      if (typeof details === 'string' && details.trim()) {
        return details
      }

      // Django REST Framework validation errors
      if (details.detail) {
        return details.detail
      }

      // Field-specific validation errors
      if (typeof details === 'object' && !Array.isArray(details)) {
        const fieldErrors = Object.entries(details)
          .map(([field, errors]) => {
            const errorList = Array.isArray(errors) ? errors : [errors]
            return `${field}: ${errorList.join(', ')}`
          })
          .join('\n')

        if (fieldErrors) {
          return fieldErrors
        }
      }

      // Array of error messages
      if (Array.isArray(details)) {
        return details.join(', ')
      }
    }

    // Use custom message if provided
    if (message && message !== this.getStatusMessage(status)) {
      return message
    }

    // Use status-based message with context
    const statusMessage = this.getStatusMessage(status)
    return context ? `${context}: ${statusMessage}` : statusMessage
  }

  /**
   * Log error for debugging
   */
  logError(parsedError, context, operation) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context,
      operation,
      ...parsedError
    }

    // Add to error log
    this.errorLog.unshift(logEntry)

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop()
    }

    // Console output with color coding
    const severityColors = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    }

    console.error(
      `${severityColors[parsedError.severity]} [${parsedError.category.toUpperCase()}] ${context}:`,
      parsedError
    )
  }

  /**
   * Handle error with automatic toast notification
   */
  handle(error, options = {}) {
    const {
      context = 'Operation',
      operation = 'unknown',
      showToast = true,
      throwError = false
    } = options

    // Parse the error
    const parsedError = this.parseError(error)

    // Log the error
    this.logError(parsedError, context, operation)

    // Format user message
    const userMessage = this.formatUserMessage(parsedError, context)

    // Show toast notification if enabled
    if (showToast) {
      this.initToast()

      // Choose toast type based on severity
      if (parsedError.severity === 'critical') {
        this.toast.error(userMessage, 5000) // Show longer for critical errors
      } else if (parsedError.severity === 'high') {
        this.toast.error(userMessage, 4000)
      } else {
        this.toast.error(userMessage, 3000)
      }
    }

    // Return standardized error response
    const errorResponse = {
      success: false,
      message: userMessage,
      error: parsedError
    }

    // Throw error if requested (for Promise rejection chains)
    if (throwError) {
      throw errorResponse
    }

    return errorResponse
  }

  /**
   * Handle success response
   */
  handleSuccess(message, options = {}) {
    const {
      showToast = true,
      data = null,
      duration = 3000
    } = options

    if (showToast) {
      this.initToast()
      this.toast.success(message, duration)
    }

    return {
      success: true,
      message,
      data
    }
  }

  /**
   * Wrap an async function with error handling
   */
  async wrap(fn, options = {}) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      return this.handle(error, options)
    }
  }

  /**
   * Get error log
   */
  getErrorLog(filters = {}) {
    let log = this.errorLog

    // Filter by category
    if (filters.category) {
      log = log.filter(entry => entry.category === filters.category)
    }

    // Filter by severity
    if (filters.severity) {
      log = log.filter(entry => entry.severity === filters.severity)
    }

    // Filter by time range
    if (filters.since) {
      const sinceDate = new Date(filters.since)
      log = log.filter(entry => new Date(entry.timestamp) >= sinceDate)
    }

    return log
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = []
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCategory: {},
      bySeverity: {},
      byStatus: {}
    }

    this.errorLog.forEach(entry => {
      // Count by category
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1

      // Count by severity
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1

      // Count by status code
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1
    })

    return stats
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler()

export default errorHandler
