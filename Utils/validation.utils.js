const { REGEX_PATTERNS, MESSAGES, DEFAULT_PAGINATION } = require('./constant');
const { AppError } = require('./error.utils');

/**
 * Utility class để xử lý validation trong ứng dụng
 */
class ValidationUtils {
  /**
   * Kiểm tra email hợp lệ
   * @param {string} email - Email cần kiểm tra
   * @returns {boolean} true nếu email hợp lệ
   * @throws {AppError} Nếu email không hợp lệ
   * @example
   * validateEmail('user@example.com') // returns true
   * validateEmail('invalid-email') // throws AppError
   */
  validateEmail(email) {
    if (!email) {
      throw new AppError(MESSAGES.VALIDATION.REQUIRED_EMAIL, 400);
    }
    if (!REGEX_PATTERNS.EMAIL.test(email)) {
      throw new AppError(MESSAGES.VALIDATION.INVALID_EMAIL, 400);
    }
    return true;
  }

  /**
   * Kiểm tra password hợp lệ
   * Yêu cầu: ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số
   * @param {string} password - Password cần kiểm tra
   * @returns {boolean} true nếu password hợp lệ
   * @throws {AppError} Nếu password không hợp lệ
   * @example
   * validatePassword('Test123') // returns true
   * validatePassword('weak') // throws AppError
   */
  validatePassword(password) {
    if (!password) {
      throw new AppError(MESSAGES.VALIDATION.REQUIRED_PASSWORD, 400);
    }
    if (!REGEX_PATTERNS.PASSWORD.test(password)) {
      throw new AppError(MESSAGES.VALIDATION.PASSWORD_LENGTH, 400);
    }
    return true;
  }

  /**
   * Kiểm tra các trường bắt buộc của user
   * @param {Object} userData - Dữ liệu user cần kiểm tra
   * @param {string} userData.email - Email của user
   * @param {string} userData.password - Password của user
   * @param {string} userData.firstName - Tên của user
   * @param {string} userData.lastName - Họ của user
   * @param {string} userData.gender - Giới tính của user
   * @returns {boolean} true nếu tất cả các trường hợp lệ
   * @throws {AppError} Nếu có bất kỳ trường nào không hợp lệ
   */
  validateUserFields(userData) {
    const { email, password, firstName, lastName, gender } = userData;

    if (!firstName) {
      throw new AppError(MESSAGES.VALIDATION.REQUIRED_FIRST_NAME, 400);
    }
    if (!lastName) {
      throw new AppError(MESSAGES.VALIDATION.REQUIRED_LAST_NAME, 400);
    }
    if (!gender) {
      throw new AppError(MESSAGES.VALIDATION.REQUIRED_GENDER, 400);
    }

    this.validateEmail(email);
    this.validatePassword(password);

    return true;
  }

  /**
   * Kiểm tra và format các tham số phân trang
   * @param {Object} query - Query parameters từ request
   * @param {number} [query.page] - Số trang
   * @param {number} [query.limit] - Số lượng item mỗi trang
   * @param {string} [query.sortBy] - Trường để sắp xếp
   * @param {string} [query.sortOrder] - Thứ tự sắp xếp ('asc' hoặc 'desc')
   * @returns {Object} Object chứa các tham số phân trang đã được format
   * @example
   * // returns { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
   * validatePagination({ page: '1', limit: '10' })
   */
  validatePagination(query) {
    const { page = DEFAULT_PAGINATION.PAGE, limit = DEFAULT_PAGINATION.LIMIT } = query;

    return {
      page: Math.max(1, parseInt(page)),
      limit: Math.max(1, Math.min(100, parseInt(limit))),
      sortBy: query.sortBy || DEFAULT_PAGINATION.SORT_BY,
      sortOrder: ['asc', 'desc'].includes(query.sortOrder?.toLowerCase())
        ? query.sortOrder.toLowerCase()
        : DEFAULT_PAGINATION.SORT_ORDER,
    };
  }
}

module.exports = new ValidationUtils();
