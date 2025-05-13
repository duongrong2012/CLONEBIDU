const BecomeSellerRequest = require('../Models/becomeSellerRequest.model');
const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { SELLER_REQUEST_STATUS, USER_ROLES } = require('../Utils/constant');

class SellerService {
  async checkExistingSellerStatus(userId) {
    const user = await User.findById(userId);
    if (user.role === USER_ROLES.SELLER) {
      throw new AppError('Bạn đã là người bán', 400);
    }
  }

  async checkPendingRequest(userId) {
    const pendingRequest = await BecomeSellerRequest.findOne({
      user: userId,
      status: SELLER_REQUEST_STATUS.PENDING,
    });

    if (pendingRequest) {
      throw new AppError('Bạn đã có một yêu cầu đang chờ xử lý', 400);
    }
  }

  async createSellerRequest(userId, requestData) {
    const sellerRequest = new BecomeSellerRequest({
      user: userId,
      ...requestData,
    });
    await sellerRequest.save();
    return sellerRequest;
  }

  async getAllRequests() {
    return BecomeSellerRequest.find().populate('user', 'username email firstName lastName');
  }

  async getRequestById(requestId) {
    const request = await BecomeSellerRequest.findById(requestId);
    if (!request) {
      throw new AppError('Không tìm thấy yêu cầu', 404);
    }
    return request;
  }

  async processRequest(requestId, status, rejectReason) {
    const request = await this.getRequestById(requestId);

    if (request.status !== SELLER_REQUEST_STATUS.PENDING) {
      throw new AppError('Yêu cầu này đã được xử lý', 400);
    }

    request.status = status;
    if (status === SELLER_REQUEST_STATUS.REJECTED) {
      if (!rejectReason) {
        throw new AppError('Vui lòng cung cấp lý do từ chối', 400);
      }
      request.rejectReason = rejectReason;
    }

    if (status === SELLER_REQUEST_STATUS.APPROVED) {
      await this.updateUserToSeller(request);
    }

    await request.save();
    return request;
  }

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

  async getUserRequests(userId) {
    return BecomeSellerRequest.find({ user: userId });
  }
}

module.exports = new SellerService();
