const BecomeSellerRequest = require('../Models/becomeSellerRequest.model');
const BaseService = require('./base.service');

class SellerService extends BaseService {
  constructor() {
    super(BecomeSellerRequest);
  }

  /**
   * Create a new seller request
   * @param {string} userId - User ID
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} Created request
   */
  async createSellerRequest(userId, requestData) {
    const sellerRequest = new this.model({
      user: userId,
      ...requestData,
    });
    await sellerRequest.save();
    return sellerRequest;
  }

  /**
   * Get all seller requests with user information
   * @returns {Promise<Array>} Array of requests with user info
   */
  async getAllRequests() {
    return this.model.find().populate('user', 'username email firstName lastName');
  }
}

module.exports = new SellerService();
