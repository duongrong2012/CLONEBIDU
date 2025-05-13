const { verifyToken, checkRole } = require('./auth.middleware');
const errorHandler = require('./error.middleware');

module.exports = {
  verifyToken,
  checkRole,
  errorHandler,
};
