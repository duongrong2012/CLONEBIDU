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
}

module.exports = new SellerController();
