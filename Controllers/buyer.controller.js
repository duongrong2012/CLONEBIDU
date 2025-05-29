const buyerService = require('../Services/buyer.service');
const BaseController = require('./base.controller');
const { AppError } = require('../Utils/error.utils');
const { MESSAGES } = require('../Utils/constant');
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

  /**
   * Update current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Updated user profile data
   */
  updateProfile = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      // Check if at least one field is provided for update
      if (Object.keys(updateData).length === 0) {
        throw new AppError(MESSAGES.VALIDATION.NO_FIELDS_TO_UPDATE, 400);
      }

      const updatedUser = await this.service.updateUserById(userId, updateData);
      return res.json(response.success(MESSAGES.USER.PROFILE_UPDATED, updatedUser));
    } catch (error) {
      next(error);
    }
  };
}

const buyerController = new BuyerController();
module.exports = buyerController;
