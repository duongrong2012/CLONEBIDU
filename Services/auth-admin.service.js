const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { MESSAGES, USER_ROLES, TOKEN_TYPES } = require('../Utils/constant');
const { generateToken, verifyToken } = require('../Utils/jwt.utils');
const validation = require('../Utils/validation.utils');
const bcrypt = require('bcrypt');

class AuthAdminService {
  /**
   * Admin login
   * @param {string} email - Admin email
   * @param {string} password - Admin password
   * @returns {Object} Admin info and tokens
   * @throws {AppError} If credentials are invalid
   */
  async login(email, password) {
    // Validate email format
    validation.validateEmail(email);

    // Find admin by email
    const admin = await User.findOne({
      email,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    }).select('+password');

    if (!admin) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Check if account is active
    if (!admin.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Generate tokens
    const accessToken = generateToken(admin._id, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(admin._id, TOKEN_TYPES.REFRESH);

    return {
      admin: admin.toPublicJSON(),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Change admin password
   * @param {string} adminId - Admin's ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   * @throws {AppError} Error when password is invalid or admin is not found
   */
  async changePassword(adminId, oldPassword, newPassword) {
    // Validate new password
    validation.validatePassword(newPassword);

    const admin = await User.findOne({
      _id: adminId,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    }).select('+password');

    if (!admin) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_PASSWORD, 401);
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return { message: MESSAGES.AUTH.PASSWORD_CHANGED };
  }

  /**
   * Refresh admin tokens
   * @param {string} refreshToken - Current refresh token
   * @returns {Object} New access token and refresh token
   * @throws {AppError} If token is invalid
   */
  async refreshToken(refreshToken) {
    const decoded = verifyToken(refreshToken, TOKEN_TYPES.REFRESH);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
    }

    // Check if user is admin
    if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id, TOKEN_TYPES.ACCESS);
    const newRefreshToken = generateToken(user._id, TOKEN_TYPES.REFRESH);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

module.exports = new AuthAdminService();
