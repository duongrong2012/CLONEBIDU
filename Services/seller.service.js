const BecomeSellerRequest = require('../Models/becomeSellerRequest.model');
const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { SELLER_REQUEST_STATUS, USER_ROLES } = require('../Utils/constant');
const BaseService = require('./base.service');

class SellerService extends BaseService {
  constructor() {
    super(BecomeSellerRequest);
  }

  /**
   * Check if user is already a seller
   * @param {string} userId - User ID
   * @throws {AppError} If user is already a seller
   */
  async checkExistingSellerStatus(userId) {
    const user = await User.findById(userId);
    if (user.role === USER_ROLES.SELLER) {
      throw new AppError('User is already a seller', 400);
    }
  }

  /**
   * Check if user has a pending request
   * @param {string} userId - User ID
   * @throws {AppError} If user has a pending request
   */
  async checkPendingRequest(userId) {
    const pendingRequest = await this.model.findOne({
      user: userId,
      status: SELLER_REQUEST_STATUS.PENDING,
    });

    if (pendingRequest) {
      throw new AppError('User already has a pending request', 400);
    }
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

  /**
   * Get request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Found request
   * @throws {AppError} If request not found
   */
  async getRequestById(requestId) {
    const request = await this.getById(requestId);
    return request;
  }

  /**
   * Process a seller request
   * @param {string} requestId - Request ID
   * @param {string} status - New status
   * @param {string} rejectReason - Reason for rejection
   * @returns {Promise<Object>} Updated request
   * @throws {AppError} If request is invalid
   */
  async processRequest(requestId, status, rejectReason) {
    const request = await this.getRequestById(requestId);

    if (request.status !== SELLER_REQUEST_STATUS.PENDING) {
      throw new AppError('Request has already been processed', 400);
    }

    request.status = status;
    if (status === SELLER_REQUEST_STATUS.REJECTED) {
      if (!rejectReason) {
        throw new AppError('Rejection reason is required', 400);
      }
      request.rejectReason = rejectReason;
    }

    if (status === SELLER_REQUEST_STATUS.APPROVED) {
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

  /**
   * Get all requests for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of user's requests
   */
  async getUserRequests(userId) {
    return this.model.find({ user: userId });
  }
}

module.exports = new SellerService();
