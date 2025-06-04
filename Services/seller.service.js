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
   * @param {Object} query - Query parameters for pagination and filtering
   * @param {string} [query.status] - Filter by status (PENDING/APPROVED/REJECTED)
   * @param {string} [query.userId] - Filter by user ID
   * @returns {Promise<Object>} Paginated requests with user info
   */
  async getAllRequests(query = {}) {
    const { status, userId, ...paginationQuery } = query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.user = userId;
    }

    const result = await this.paginate(paginationQuery, filter);
    result.data = await this.model.populate(result.data, {
      path: 'user',
      select: 'username email firstName lastName',
    });
    return result;
  }
}

module.exports = new SellerService();
