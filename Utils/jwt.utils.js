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
   * Extract token from Bearer Authentication header
   * @param {string} authHeader - Authorization header value
   * @returns {string} Extracted token
   * @throws {AppError} If token is not provided or invalid format
   */
  extractTokenFromBearer(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(MESSAGES.AUTH.TOKEN_REQUIRED, 401);
    }
    return authHeader.split(' ')[1];
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

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @param {string} type - Token type (access or refresh)
   * @returns {Object} Decoded token payload
   * @throws {AppError} If token is invalid or expired
   */
  verifyToken(token, type = TOKEN_TYPES.ACCESS) {
    if (!token) {
      throw new AppError(
        type === TOKEN_TYPES.ACCESS
          ? MESSAGES.AUTH.TOKEN_REQUIRED
          : MESSAGES.AUTH.REFRESH_TOKEN_REQUIRED,
        401
      );
    }

    try {
      const secret =
        type === TOKEN_TYPES.ACCESS
          ? JWT_CONFIG.ACCESS_TOKEN.SECRET
          : JWT_CONFIG.REFRESH_TOKEN.SECRET;

      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(MESSAGES.AUTH.TOKEN_EXPIRED, 401);
      }
      throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
    }
  }
}

module.exports = new JWTUtils();
