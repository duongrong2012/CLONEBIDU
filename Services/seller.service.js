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
}

module.exports = new SellerService();
