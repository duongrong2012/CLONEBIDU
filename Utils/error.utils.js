/**
 * Custom Error class for handling application errors
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an instance of AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} [errors] - Error details (optional)
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
 * Utility class for handling application errors
 */
class ErrorUtils {
  /**
   * Handle Mongoose errors
   * @param {Error} err - Mongoose error
   * @returns {AppError} Formatted error
   */
  static handleMongooseError(err) {
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
   * Handle JWT errors
   * @param {Error} err - JWT error
   * @returns {AppError} Formatted error
   */
  static handleJWTError(err) {
    if (err.name === 'JsonWebTokenError') {
      return new AppError('Invalid token', 401);
    }
    if (err.name === 'TokenExpiredError') {
      return new AppError('Token has expired', 401);
    }
    return new AppError('Authentication error', 401);
  }
}

/**
 * Wrapper function to catch async errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  errorUtils: new ErrorUtils(),
  catchAsync,
};
