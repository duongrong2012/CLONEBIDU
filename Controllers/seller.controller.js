const sellerService = require('../Services/seller.service');
const BaseController = require('./base.controller');
const response = require('../Utils/response.utils');

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
}

module.exports = new SellerController();
