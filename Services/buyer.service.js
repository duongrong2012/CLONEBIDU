const User = require('../Models/user.model');
const BaseService = require('./base.service');

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
}

module.exports = new BuyerService();
