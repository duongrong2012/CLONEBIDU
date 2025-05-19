const { AppError } = require('../Utils/error.utils');
const { verifyToken: verifyJwtToken } = require('../Utils/jwt.utils');
const { MESSAGES, TOKEN_TYPES, ERROR_CODES } = require('../Utils/constant');
const User = require('../Models/user.model');

/**
 * Middleware to verify JWT access token and check role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
const verifyAccessToken = (allowedRoles = []) => {
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
      const user = await User.findById(decoded.userId);
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

      req.user = { _id: decoded.userId, role: user.role };
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check user role
 * @param {Array<string>} roles - Array of allowed roles
 */
const checkRole = roles => {
  return async (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to verify refresh token and check role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
const verifyRefreshToken = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const refreshToken =
        req.cookies.refreshToken || req.headers['x-refresh-token'] || req.body.refreshToken;
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
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
      }

      if (!user.isActive) {
        throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
      }

      req.user = { _id: user._id, role: user.role };
      req.refreshToken = refreshToken;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  verifyAccessToken,
  checkRole,
  verifyRefreshToken,
};
