const buyerService = require('../Services/buyer.service');
const BaseController = require('./base.controller');
const response = require('../Utils/response.utils');

class BuyerController extends BaseController {
  constructor() {
    super(buyerService);
  }
  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getProfile = async (req, res, next) => {
    try {
      const result = await this.service.getUserById(req.user._id);
      return res.json(response.success('Profile retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  };
}

const buyerController = new BuyerController();
module.exports = buyerController;
