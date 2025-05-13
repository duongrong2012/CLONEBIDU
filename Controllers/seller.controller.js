const sellerService = require('../Services/seller.service');
const { SELLER_REQUEST_STATUS } = require('../Utils/constant');

// Gửi yêu cầu trở thành người bán
exports.submitSellerRequest = async (req, res, next) => {
  try {
    await sellerService.checkExistingSellerStatus(req.user._id);
    await sellerService.checkPendingRequest(req.user._id);

    const sellerRequest = await sellerService.createSellerRequest(req.user._id, req.body);

    res.status(201).json({
      success: true,
      message: 'Yêu cầu của bạn đã được gửi thành công',
      data: sellerRequest,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách yêu cầu (chỉ admin)
exports.getSellerRequests = async (req, res, next) => {
  try {
    const requests = await sellerService.getAllRequests();
    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// Xử lý yêu cầu (chỉ admin)
exports.processSellerRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, rejectReason } = req.body;

    const request = await sellerService.processRequest(requestId, status, rejectReason);

    res.json({
      success: true,
      message:
        status === SELLER_REQUEST_STATUS.APPROVED
          ? 'Yêu cầu đã được chấp nhận'
          : 'Yêu cầu đã bị từ chối',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy thông tin yêu cầu của người dùng hiện tại
exports.getUserRequests = async (req, res, next) => {
  try {
    const requests = await sellerService.getUserRequests(req.user._id);
    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};
