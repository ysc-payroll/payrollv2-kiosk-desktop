/**
 * Base CRUD Service
 * Provides common CRUD operations for all resource types
 * Eliminates code duplication across similar services
 */

export class BaseCrudService {
  constructor(httpClient, endpoint) {
    this.http = httpClient
    this.endpoint = endpoint
  }

  /**
   * Get all resources with optional query parameters
   */
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${this.endpoint}/?${queryString}` : `${this.endpoint}/`
    return this.http.get(url)
  }

  /**
   * Get a single resource by ID
   */
  async getById(id) {
    return this.http.get(`${this.endpoint}/${id}/`)
  }

  /**
   * Create a new resource
   */
  async create(data) {
    return this.http.post(`${this.endpoint}/`, data)
  }

  /**
   * Update an existing resource
   */
  async update(id, data) {
    return this.http.patch(`${this.endpoint}/${id}/`, data)
  }

  /**
   * Delete a resource
   */
  async delete(id) {
    return this.http.delete(`${this.endpoint}/${id}/`)
  }

  /**
   * Cancel a resource (common pattern for applications)
   */
  async cancel(id) {
    return this.http.post(`${this.endpoint}/${id}/cancel/`)
  }

  /**
   * Export resources to CSV
   */
  async exportToCSV(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${this.endpoint}/export/?${queryString}` : `${this.endpoint}/export/`
    return this.http.get(url)
  }
}
