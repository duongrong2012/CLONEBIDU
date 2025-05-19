/**
 * Utility class for handling responses to clients
 * Ensures consistent response format throughout the application
 */
class ResponseUtils {
  /**
   * Create success response
   * @param {string} message - Success message
   * @param {any} [data=null] - Response data (optional)
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {Object} Formatted success response
   * @example
   * // returns { status: 'success', code: 200, message: 'User created', data: { id: 1 } }
   * success('User created', { id: 1 })
   */
  success(message, data = null, statusCode = 200) {
    return {
      status: 'success',
      code: statusCode,
      message,
      data,
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
   * Tạo response với phân trang
   * @param {string} message - Thông báo
   * @param {Array} data - Dữ liệu trả về
   * @param {Object} pagination - Thông tin phân trang
   * @param {number} pagination.page - Trang hiện tại
   * @param {number} pagination.limit - Số lượng item mỗi trang
   * @param {number} pagination.total - Tổng số item
   * @param {number} pagination.totalPages - Tổng số trang
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {Object} Response object với thông tin phân trang
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
}

module.exports = new ResponseUtils();
