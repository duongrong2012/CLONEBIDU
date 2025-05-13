const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { MESSAGES, USER_ROLES, TOKEN_TYPES } = require('../Utils/constant');
const { generateToken } = require('../Utils/jwt.utils');
const validation = require('../Utils/validation.utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthAdminService {
  /**
   * Đăng nhập admin
   * @param {string} email - Email của admin
   * @param {string} password - Mật khẩu của admin
   * @returns {Object} Thông tin admin và tokens
   * @throws {AppError} Lỗi khi thông tin đăng nhập không hợp lệ
   */
  async login(email, password) {
    // Validate input
    validation.validateEmail(email);
    validation.validatePassword(password);

    const admin = await User.findOne({ email, role: USER_ROLES.ADMIN });
    if (!admin) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    if (!admin.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, 403);
    }

    // Tạo tokens
    const accessToken = generateToken(admin._id, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(admin._id, TOKEN_TYPES.REFRESH);

    return {
      admin: admin.toPublicJSON(),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Lấy thông tin profile của admin
   * @param {string} adminId - ID của admin
   * @returns {Object} Thông tin admin
   * @throws {AppError} Lỗi khi không tìm thấy admin
   */
  async getProfile(adminId) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== USER_ROLES.ADMIN) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }
    return admin.toPublicJSON();
  }

  /**
   * Cập nhật thông tin profile của admin
   * @param {string} adminId - ID của admin
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object} Thông tin admin đã cập nhật
   * @throws {AppError} Lỗi khi không tìm thấy admin hoặc dữ liệu không hợp lệ
   */
  async updateProfile(adminId, updateData) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== USER_ROLES.ADMIN) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    // Validate update data
    if (updateData.email) {
      validation.validateEmail(updateData.email);
      const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: adminId } });
      if (existingUser) {
        throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400);
      }
    }

    Object.assign(admin, updateData);
    await admin.save();
    return admin.toPublicJSON();
  }

  /**
   * Đổi mật khẩu admin
   * @param {string} adminId - ID của admin
   * @param {string} oldPassword - Mật khẩu cũ
   * @param {string} newPassword - Mật khẩu mới
   * @returns {Object} Thông báo đổi mật khẩu thành công
   * @throws {AppError} Lỗi khi mật khẩu không hợp lệ hoặc không tìm thấy admin
   */
  async changePassword(adminId, oldPassword, newPassword) {
    // Validate new password
    validation.validatePassword(newPassword);

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== USER_ROLES.ADMIN) {
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
   * Refresh access token cho admin
   * @param {string} refreshToken - Refresh token
   * @returns {Object} Access token mới
   * @throws {AppError} Lỗi khi token không hợp lệ hoặc hết hạn
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError(MESSAGES.AUTH.REFRESH_TOKEN_REQUIRED, 401);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Kiểm tra admin có tồn tại và còn active
      const admin = await User.findById(decoded.userId);
      if (!admin || admin.role !== USER_ROLES.ADMIN || !admin.isActive) {
        throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
      }

      // Tạo access token mới
      const accessToken = generateToken(admin._id, TOKEN_TYPES.ACCESS);

      return { accessToken };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(MESSAGES.AUTH.TOKEN_EXPIRED, 401);
      }
      throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
    }
  }
}

module.exports = new AuthAdminService();
