const jwt = require('jsonwebtoken');
const { AppError } = require('./error.utils');
const { TOKEN_TYPES, MESSAGES, JWT_CONFIG } = require('./constant');

/**
 * Utility class để xử lý JSON Web Tokens (JWT)
 * @class JWTUtils
 */
class JWTUtils {
    constructor() {
        // Kiểm tra các biến môi trường bắt buộc
        if (!JWT_CONFIG.ACCESS_TOKEN.SECRET || !JWT_CONFIG.REFRESH_TOKEN.SECRET) {
            throw new Error('JWT secret keys are required in environment variables');
        }
    }

    /**
     * Tạo JWT token
     * @param {string} userId - ID của user
     * @param {string} type - Loại token (access hoặc refresh)
     * @returns {string} JWT token
     * @throws {AppError} Nếu type không hợp lệ
     */
    generateToken(userId, type = TOKEN_TYPES.ACCESS) {
        try {
            const config = type === TOKEN_TYPES.ACCESS
                ? JWT_CONFIG.ACCESS_TOKEN
                : JWT_CONFIG.REFRESH_TOKEN;

            return jwt.sign({ userId }, config.SECRET, { expiresIn: config.EXPIRES_IN });
        } catch (error) {
            throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 500);
        }
    }

    /**
     * Verify và decode JWT token
     * @param {string} token - JWT token cần verify
     * @param {string} type - Loại token (access hoặc refresh)
     * @returns {Object} Decoded token payload
     * @throws {AppError} Nếu token không hợp lệ hoặc hết hạn
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
            const secret = type === TOKEN_TYPES.ACCESS
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
     * Decode JWT token mà không verify
     * @param {string} token - JWT token cần decode
     * @returns {Object|null} Decoded token payload hoặc null nếu token không hợp lệ
     */
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null;
        }
    }

    /**
     * Refresh access token sử dụng refresh token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} Object chứa access token mới
     * @throws {AppError} Nếu refresh token không hợp lệ
     */
    refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken, TOKEN_TYPES.REFRESH);
            const accessToken = this.generateToken(decoded.userId, TOKEN_TYPES.ACCESS);

            return { accessToken };
        } catch (error) {
            throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
        }
    }
}

module.exports = new JWTUtils(); 