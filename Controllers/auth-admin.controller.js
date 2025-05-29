const authAdminService = require('../Services/auth-admin.service');
const response = require('../Utils/response.utils');
const { MESSAGES } = require('../Utils/constant');

class AuthAdminController {
  /**
   * Register a new admin account
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body containing admin data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Response with success/error message
   */
  register = async (req, res, next) => {
    try {
      const userData = req.body;
      await authAdminService.register(userData);
      return res.status(201).json(response.success(MESSAGES.AUTH.REGISTER_SUCCESS));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthAdminController();
