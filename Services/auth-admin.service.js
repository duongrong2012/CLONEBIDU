const { AppError } = require('../Utils/error.utils');
const { MESSAGES, USER_ROLES } = require('../Utils/constant');
const User = require('../Models/user.model');

class AuthAdminService {
  /**
   * Register a new admin
   * @param {Object} userData - User data for registration
   * @returns {Promise<Object>} Created admin data
   * @throws {AppError} If email already exists
   */
  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400);
    }

    const user = await User.create({
      ...userData,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    return {
      user: user.toPublicJSON(),
    };
  }
}

module.exports = new AuthAdminService();
