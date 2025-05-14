const { verifyToken, checkRole } = require('./auth.middleware');
const errorHandler = require('./error.middleware');
const { validateUserFields } = require('./validation.middleware');

module.exports = {
  verifyToken,
  checkRole,
  errorHandler,
  validateUserFields,
};
