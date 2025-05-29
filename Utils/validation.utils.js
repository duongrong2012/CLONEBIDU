const { REGEX_PATTERNS, MESSAGES, DEFAULT_PAGINATION } = require('./constant');
const { AppError } = require('./error.utils');

/**
 * Utility class for handling validation in the application
 */
class ValidationUtils {
  /**
   * Check if email is valid
   * @param {string} email - Email to validate
   * @returns {boolean} true if email is valid
   * @throws {AppError} If email is invalid
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
   * Check if password is valid
   * Requirements: at least 6 characters, including uppercase, lowercase and numbers
   * @param {string} password - Password to validate
   * @returns {boolean} true if password is valid
   * @throws {AppError} If password is invalid
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
   * Check and format pagination parameters
   * @param {Object} query - Query parameters from request
   * @param {number} [query.page] - Page number
   * @param {number} [query.limit] - Number of items per page
   * @param {string} [query.sortBy] - Field to sort by
   * @param {string} [query.sortOrder] - Sort order ('asc' or 'desc')
   * @returns {Object} Object containing formatted pagination parameters
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

  /**
   * Validates birthday format and age requirements
   * @param {string} birthday - Birthday in ISO format (YYYY-MM-DD)
   * @throws {Error} If birthday is invalid
   */
  validateBirthday(birthday) {
    const date = new Date(birthday);
    const now = new Date();

    if (date > now) {
      throw new Error(MESSAGES.VALIDATION.BIRTHDAY_FUTURE);
    }

    // Check if age is at least 13 years
    const age = now.getFullYear() - date.getFullYear();
    if (age < 13) {
      throw new Error(MESSAGES.VALIDATION.BIRTHDAY_AGE);
    }
  }
}

module.exports = new ValidationUtils();
