/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} _next - Express next middleware function
 */
const logger = require('../Utils/logger');

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || null;
  const status = err.status || 'error';

  const logPayload = {
    message: 'Request failed',
    request_id: req.requestId || null,
    method: req.method,
    path: req.originalUrl,
    status_code: statusCode,
    error_name: err.name,
    error_message: message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error({ ...logPayload, status: 'error' });
  } else if (statusCode >= 400) {
    logger.warn({ ...logPayload, status: 'warn' });
  } else {
    logger.info({ ...logPayload, status: 'info' });
  }

  res.status(statusCode).json({
    status,
    code: statusCode,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
