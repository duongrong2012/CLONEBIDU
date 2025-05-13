const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { USER_ROLES, MESSAGES } = require('../Utils/constant');
const BaseService = require('./base.service');
const validation = require('../Utils/validation.utils');

class AdminService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Get admin profile
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Admin information
   * @throws {AppError} If admin not found
   */
  async getProfile(adminId) {
    const admin = await User.findOne({
      _id: adminId,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    });

    if (!admin) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }
    return admin.toPublicJSON();
  }

  /**
   * Update admin profile
   * @param {string} adminId - Admin ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated admin information
   * @throws {AppError} If admin not found or data invalid
   */
  async updateProfile(adminId, updateData) {
    const admin = await User.findOne({
      _id: adminId,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    });

    if (!admin) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    // Validate update data
    if (updateData.email) {
      validation.validateEmail(updateData.email);
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: adminId },
      });
      if (existingUser) {
        throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400);
      }
    }

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.isActive;

    Object.assign(admin, updateData);
    await admin.save();
    return admin.toPublicJSON();
  }

  /**
   * Get all admins
   * @returns {Promise<Array>} List of admins
   */
  async getAllAdmins() {
    return User.find({
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    }).select('-password');
  }

  /**
   * Create new admin
   * @param {Object} adminData - Admin data
   * @returns {Promise<Object>} Created admin
   * @throws {AppError} If email exists or data invalid
   */
  async createAdmin(adminData) {
    // Validate required fields
    validation.validateEmail(adminData.email);
    validation.validatePassword(adminData.password);

    // Check if email exists
    const existingUser = await User.findOne({ email: adminData.email });
    if (existingUser) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400);
    }

    // Create admin
    const admin = new User({
      ...adminData,
      role: USER_ROLES.ADMIN,
      isEmailVerified: true,
    });

    await admin.save();
    return admin.toPublicJSON();
  }

  /**
   * Deactivate admin account
   * @param {string} adminId - Admin ID
   * @returns {Promise<void>}
   * @throws {AppError} If admin not found
   */
  async deactivateAdmin(adminId) {
    const admin = await User.findOne({
      _id: adminId,
      role: USER_ROLES.ADMIN, // Only allow deactivating regular admins
    });

    if (!admin) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    admin.isActive = false;
    await admin.save();
  }
}

module.exports = new AdminService();
