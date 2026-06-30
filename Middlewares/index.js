const errorHandler = require('./error.middleware');
const requestLogger = require('./request-logger.middleware');
const {
  validateUserFields,
  validateBuyerLogin,
  validateSocialLogin,
  validateForgotPassword,
  validateResetPassword,
} = require('./validation.middleware');
const { verifyRefreshToken } = require('./auth.middleware');
const {
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
} = require('./bookmark-validation');
const { forgotPasswordRateLimit } = require('./forgot-password-rate-limit.middleware');

module.exports = {
  errorHandler,
  requestLogger,
  validateUserFields,
  validateBuyerLogin,
  validateSocialLogin,
  validateForgotPassword,
  forgotPasswordRateLimit,
  validateResetPassword,
  verifyRefreshToken,
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
};
