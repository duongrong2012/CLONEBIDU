const errorHandler = require('./error.middleware');
const requestLogger = require('./request-logger.middleware');
const {
  validateUserFields,
  validateBuyerLogin,
  validateSocialLogin,
} = require('./validation.middleware');
const { verifyRefreshToken } = require('./auth.middleware');
const {
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
} = require('./bookmark-validation');

module.exports = {
  errorHandler,
  requestLogger,
  validateUserFields,
  validateBuyerLogin,
  validateSocialLogin,
  verifyRefreshToken,
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
};
