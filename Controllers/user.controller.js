const userService = require('../Services/user.service');
const BaseController = require('./base.controller');
const response = require('../Utils/response.utils');

class UserController extends BaseController {
  constructor() {
    super(userService);
  }

  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  register = async (req, res, next) => {
    try {
      const result = await this.service.register(req.body);
      return res.status(201).json(response.success('User registered successfully', result));
    } catch (error) {
      next(error);
    }
  };

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
   */
  updateProfile = async (req, res, next) => {
    try {
      const result = await this.service.updateUser(req.user._id, req.body);
      return res.json(response.success('Profile updated successfully', result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user information by ID (Admin only)
   */
  getUserById = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = await this.service.getUserById(userId);
      return res.json(response.success('User retrieved successfully', user));
    } catch (error) {
      next(error);
    }
  };
}

const userController = new UserController();
module.exports = userController;
