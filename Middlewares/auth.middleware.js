const { AppError } = require('../Utils/error.utils');
const { verifyToken: verifyJwtToken, extractTokenFromBearer } = require('../Utils/jwt.utils');
const { MESSAGES, TOKEN_TYPES, ERROR_CODES } = require('../Utils/constant');
const User = require('../Models/user.model');

/**
 * Middleware to verify JWT access token and check role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
const verifyToken = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new AppError(MESSAGES.AUTH.TOKEN_REQUIRED, 401);
      }

      let decoded;
      try {
        decoded = verifyJwtToken(token, TOKEN_TYPES.ACCESS);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          throw new AppError(MESSAGES.AUTH.TOKEN_EXPIRED, 401, {
            code: ERROR_CODES.TOKEN_EXPIRED,
          });
        }
        throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
      }

      // Check if user exists
      const user = await User.findById(decoded._id);
      if (!user) {
        throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
      }

      // Check if user has allowed role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
      }

      req.user = user.toPublicJSON();
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware để verify refresh token và kiểm tra role
 * @param {Array<string>} allowedRoles - Mảng các role được phép refresh token
 */
const verifyRefreshToken = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const refreshToken = extractTokenFromBearer(req.headers.authorization);

      if (!refreshToken) {
        throw new AppError(MESSAGES.AUTH.TOKEN_REQUIRED, 401);
      }

      let decoded;
      try {
        decoded = verifyJwtToken(refreshToken, TOKEN_TYPES.REFRESH);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          throw new AppError(MESSAGES.AUTH.TOKEN_EXPIRED, 401);
        }
        throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
      }

      // Check user
      const user = await User.findById(decoded._id);

      if (!user) {
        throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
      }

      if (!user.isActive) {
        throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
      }

      req.user = user.toPublicJSON();
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  verifyRefreshToken,
  verifyToken,
};
