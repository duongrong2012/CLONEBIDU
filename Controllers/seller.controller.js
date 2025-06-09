const sellerService = require('../Services/seller.service');
const BaseController = require('./base.controller');
const response = require('../Utils/response.utils');

class SellerController extends BaseController {
  constructor() {
    super(sellerService);
  }

  /**
   * Get all seller requests (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getSellerRequests = async (req, res, next) => {
    try {
      const result = await this.service.getAllRequests(req.query);
      res.json(
        response.success('Requests retrieved successfully', response.groupPagination(result))
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get seller requests for the current user (buyer/seller only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getMyRequests = async (req, res, next) => {
    try {
      const result = await this.service.getMyRequests(req.user._id, req.query);
      res.json(
        response.success('Your requests retrieved successfully', response.groupPagination(result))
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Submit a request to become a seller
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  submitSellerRequest = async (req, res, next) => {
    try {
      const sellerRequest = await this.service.createSellerRequest(
        req.user._id,
        req.validatedSellerRequest
      );
      res.status(201).json(response.success('Request submitted successfully', sellerRequest));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Process a seller request (approve/reject)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  processSellerRequest = async (req, res, next) => {
    try {
      const { validatedSellerRequest, validatedProcessData } = req;
      const updatedRequest = await this.service.processRequest(
        validatedSellerRequest,
        validatedProcessData
      );
      res.status(200).json(response.success('Request processed successfully', updatedRequest));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel a pending seller request (buyer only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  cancelSellerRequest = async (req, res, next) => {
    try {
      const request = req.validatedSellerRequest;
      const result = await this.service.cancelSellerRequest(request);
      res.status(200).json(response.success('Request cancelled successfully', result));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new SellerController();
