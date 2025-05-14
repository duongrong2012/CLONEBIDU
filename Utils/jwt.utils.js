const jwt = require('jsonwebtoken');
const { AppError } = require('./error.utils');
const { TOKEN_TYPES, MESSAGES, JWT_CONFIG } = require('./constant');

/**
 * Utility class for handling JSON Web Tokens (JWT)
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
   * @param {string} userId - User ID
   * @param {string} type - Token type (access or refresh)
   * @returns {string} JWT token
   * @throws {AppError} If type is invalid
   */
  generateToken(userId, type = TOKEN_TYPES.ACCESS) {
    try {
      const config =
        type === TOKEN_TYPES.ACCESS ? JWT_CONFIG.ACCESS_TOKEN : JWT_CONFIG.REFRESH_TOKEN;

      return jwt.sign({ userId }, config.SECRET, { expiresIn: config.EXPIRES_IN });
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

  /**
   * Decode JWT token without verification
   * @param {string} token - JWT token to decode
   * @returns {Object|null} Decoded token payload or null if token is invalid
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} Object containing new access token
   * @throws {AppError} If refresh token is invalid
   */
  refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken, TOKEN_TYPES.REFRESH);
      const accessToken = this.generateToken(decoded.userId, TOKEN_TYPES.ACCESS);

      return { accessToken };
    } catch {
      throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
    }
  }
}

module.exports = new JWTUtils();
