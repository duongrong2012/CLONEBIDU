/**
 * Utility class để xử lý response trả về cho client
 * Đảm bảo format response nhất quán trong toàn bộ ứng dụng
 */
class ResponseUtils {
  /**
   * Tạo response thành công
   * @param {string} message - Thông báo thành công
   * @param {any} [data=null] - Dữ liệu trả về (optional)
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {Object} Response object
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
   * Tạo response lỗi
   * @param {string} message - Thông báo lỗi
   * @param {number} [statusCode=400] - HTTP status code
   * @param {Object} [errors=null] - Chi tiết các lỗi (optional)
   * @returns {Object} Response object
   * @example
   * // returns { status: 'error', code: 400, message: 'Validation failed', errors: { email: 'Invalid email' } }
   * error('Validation failed', 400, { email: 'Invalid email' })
   */
  error(message, statusCode = 400, errors = null) {
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
