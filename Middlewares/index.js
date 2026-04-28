const errorHandler = require('./error.middleware');
const requestLogger = require('./request-logger.middleware');
const { validateUserFields, validateBuyerLogin } = require('./validation.middleware');
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
  verifyRefreshToken,
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
};
