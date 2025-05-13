const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const BaseService = require('./base.service');

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Register a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async register(userData) {
    const existingUser = await this.model.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }

    const user = await this.create(userData);
    return user.toPublicJSON();
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
   * Update user information
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updateData) {
    // Do not allow updating email and password through this method
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;

    const user = await this.update(userId, updateData);
    return user.toPublicJSON();
  }
}

module.exports = new UserService();
