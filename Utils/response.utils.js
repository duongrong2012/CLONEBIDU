/**
 * Utility class for handling responses to clients
 * Ensures consistent response format throughout the application
 */
class ResponseUtils {
  /**
   * Create success response
   * @param {string} message - Success message
   * @param {any} [payload=null] - Response data (optional)
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {Object} Formatted success response
   * @example
   * // returns { status: 'success', code: 200, message: 'User created', data: { id: 1 } }
   * success('User created', { id: 1 })
   */
  success(message, payload = null, statusCode = 200) {
    return {
      status: 'success',
      code: statusCode,
      message,
      payload,
    };
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {any} [errors=null] - Error details (optional)
   * @returns {Object} Formatted error response
   * @example
   * // returns { status: 'error', code: 400, message: 'Validation failed', errors: { email: 'Invalid email' } }
   * error('Validation failed', 400, { email: 'Invalid email' })
   */
  error(message, statusCode = 500, errors = null) {
    return {
      status: 'error',
      code: statusCode,
      message,
      errors,
    };
  }

  /**
   * Create paginated response
   * @param {string} message - Response message
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination information
   * @param {number} pagination.page - Current page
   * @param {number} pagination.limit - Items per page
   * @param {number} pagination.total - Total items
   * @param {number} pagination.totalPages - Total pages
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {Object} Response object with pagination information
   * @example
   * // returns {
   * //   status: 'success',
   * //   code: 200,
   * //   message: 'Users retrieved',
   * //   data: [...],
   * //   pagination: { page: 1, limit: 10, total: 100, totalPages: 10 }
   * // }
   * paginate('Users retrieved', users, { page: 1, limit: 10, total: 100, totalPages: 10 })
   */
  paginate(message, data, pagination, statusCode = 200) {
    return {
      status: 'success',
      code: statusCode,
      message,
      data,
      pagination,
    };
  }

  /**
   * Group data and pagination info into a single object
   * @param {Object} result - Result object from service (data, page, limit, total, totalPages)
   * @returns {Object} { data, pagination }
   */
  groupPagination(result) {
    const { data, page, limit, total, totalPages } = result;
    return {
      data,
      pagination: { page, limit, total, totalPages },
    };
  }
}

module.exports = new ResponseUtils();
