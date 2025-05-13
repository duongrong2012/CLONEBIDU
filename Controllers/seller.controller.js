const sellerService = require('../Services/seller.service');
const BaseController = require('./base.controller');
const response = require('../Utils/response.utils');
const { SELLER_REQUEST_STATUS } = require('../Utils/constant');

class SellerController extends BaseController {
  constructor() {
    super(sellerService);
  }

  /**
   * Submit a request to become a seller
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  submitSellerRequest = async (req, res, next) => {
    try {
      await this.service.checkExistingSellerStatus(req.user._id);
      await this.service.checkPendingRequest(req.user._id);

      const sellerRequest = await this.service.createSellerRequest(req.user._id, req.body);

      res.status(201).json(response.success('Request submitted successfully', sellerRequest));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all seller requests (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getSellerRequests = async (req, res, next) => {
    try {
      const requests = await this.service.getAllRequests();
      res.json(response.success('Requests retrieved successfully', requests));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Process a seller request (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  processSellerRequest = async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { status, rejectReason } = req.body;

      const request = await this.service.processRequest(requestId, status, rejectReason);

      res.json(
        response.success(
          status === SELLER_REQUEST_STATUS.APPROVED
            ? 'Request approved successfully'
            : 'Request rejected successfully',
          request
        )
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user's requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getUserRequests = async (req, res, next) => {
    try {
      const requests = await this.service.getUserRequests(req.user._id);
      res.json(response.success('User requests retrieved successfully', requests));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new SellerController();
