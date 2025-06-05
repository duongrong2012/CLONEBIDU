const BecomeSellerRequest = require('../Models/becomeSellerRequest.model');
const User = require('../Models/user.model');
const { USER_ROLES } = require('../Utils/constant');
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

    const options = {
      ...paginationQuery,
      populate: {
        path: 'user',
        select: 'username email firstName lastName',
      },
    };

    return this.paginate(options, filter);
  }

  /**
   * Process a seller request
   * @param {Object} request - Seller request document
   * @param {Object} processData - Process data
   * @param {string} processData.status - New status (APPROVED/REJECTED)
   * @param {string} processData.rejectReason - Reason for rejection
   * @param {boolean} processData.shouldUpdateUser - Whether to update user role
   * @returns {Promise<Object>} Updated request
   */
  async processRequest(request, processData) {
    request.status = processData.status;
    request.rejectReason = processData.rejectReason;

    if (processData.shouldUpdateUser) {
      await this.updateUserToSeller(request);
    }

    await request.save();
    return request;
  }

  /**
   * Update user role to seller
   * @param {Object} request - Approved request
   */
  async updateUserToSeller(request) {
    const user = await User.findById(request.user);
    user.role = USER_ROLES.SELLER;
    user.shop = {
      birthday: request.birthday,
      identityNumber: request.identityNumber,
      bankName: request.bankName,
      bankBranch: request.bankBranch,
      taxCode: request.taxCode,
      national: request.national,
      shop: request.shop,
      shopName: request.shopName,
      isCompanyRegistered: request.isCompanyRegistered,
      address: request.address,
      province: request.province,
      district: request.district,
      ward: request.ward,
      currentDigitalPlatforms: request.currentDigitalPlatforms,
    };
    await user.save();
  }
}

module.exports = new SellerService();
