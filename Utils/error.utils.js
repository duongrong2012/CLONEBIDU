const { MESSAGES } = require('./constant');

/**
 * Custom Error class để xử lý các lỗi trong ứng dụng
 * @extends Error
 */
class AppError extends Error {
  /**
   * Tạo một instance của AppError
   * @param {string} message - Thông báo lỗi
   * @param {number} statusCode - HTTP status code
   * @param {Object} [errors] - Chi tiết các lỗi (optional)
   */
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errors = errors;
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Utility class để xử lý các lỗi trong ứng dụng
 */
class ErrorUtils {
  /**
   * Xử lý lỗi từ Mongoose
   * @param {Error} err - Lỗi từ Mongoose
   * @returns {AppError} Custom error object
   */
  handleMongooseError(err) {
    if (err.name === 'ValidationError') {
      const errors = {};
      Object.keys(err.errors).forEach(key => {
        errors[key] = err.errors[key].message;
      });
      return new AppError('Validation Error', 400, errors);
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return new AppError(`Duplicate value for ${field}`, 400);
    }

    return new AppError('Database Error', 500);
  }

  /**
   * Xử lý lỗi từ JWT
   * @param {Error} err - Lỗi từ JWT
   * @returns {AppError} Custom error object
   */
  handleJWTError(err) {
    if (err.name === 'JsonWebTokenError') {
      return new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
    }
    if (err.name === 'TokenExpiredError') {
      return new AppError(MESSAGES.AUTH.TOKEN_EXPIRED, 401);
    }
    return new AppError(MESSAGES.AUTH.UNAUTHORIZED, 401);
  }
}

module.exports = {
  AppError,
  errorUtils: new ErrorUtils(),
};
