const User = require('../Models/user.model');
const BaseService = require('./base.service');
const { AppError } = require('../Utils/error.utils');

class BuyerService extends BaseService {
  constructor() {
    super(User);
  }
  /**
   * Get user information by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User information
   */
  async getUserById(userId) {
    const user = await this.getById(userId);
    return user.toPublicJSON();
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user object (public fields only)
   */
  async updateUserById(userId, updateData) {
    const user = await this.model.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!user) throw new AppError('User not found', 404);
    const userObj = user.toPublicJSON();
    return userObj;
  }
}

module.exports = new BuyerService();
