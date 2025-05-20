const jwt = require('jsonwebtoken');
const { AppError } = require('./error.utils');
const { TOKEN_TYPES, MESSAGES, JWT_CONFIG } = require('./constant');

/**
 * Utility class để xử lý JSON Web Tokens (JWT)
 * @class JWTUtils
 */
class JWTUtils {
  constructor() {
    // Check required environment variables
    if (!JWT_CONFIG.ACCESS_TOKEN.SECRET || !JWT_CONFIG.REFRESH_TOKEN.SECRET) {
      throw new Error('JWT secret keys are required in environment variables');
    }
  }

  /**
   * Generate JWT token
   * @param {Object} user - User information
   * @param {string} type - Token type (access or refresh)
   * @returns {string} JWT token
   * @throws {AppError} If type is invalid
   */
  generateToken(user, type = TOKEN_TYPES.ACCESS) {
    try {
      const config =
        type === TOKEN_TYPES.ACCESS ? JWT_CONFIG.ACCESS_TOKEN : JWT_CONFIG.REFRESH_TOKEN;

      // Create payload from user object, excluding sensitive fields
      const userObject = user.toObject ? user.toObject() : user;
      // eslint-disable-next-line no-unused-vars
      const { password, __v, ...payload } = userObject;

      return jwt.sign(payload, config.SECRET, { expiresIn: config.EXPIRES_IN });
    } catch {
      throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 500);
    }
  }
}

module.exports = new JWTUtils();
