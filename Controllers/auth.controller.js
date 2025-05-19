const authService = require('../Services/auth.service');
const response = require('../Utils/response.utils');

class AuthController {
  /**
   * Register a new user account
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body containing user data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Response with success/error message
   */
  register = async (req, res, next) => {
    try {
      const userData = req.body;

      await authService.register(userData);

      return res.status(201).json(response.success('User registered successfully'));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthController();
