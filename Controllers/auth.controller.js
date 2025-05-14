const authService = require('../Services/auth.service');
const response = require('../Utils/response.utils');
const { TOKEN_COOKIE_CONFIG } = require('../Utils/constant');

class AuthController {
  /**
   * Register a new user account
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body containing user data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Response with user information
   */
  register = async (req, res, next) => {
    try {
      const userData = req.body;
      const result = await authService.register(userData);

      // Set tokens in cookies
      res.cookie('accessToken', result.tokens.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.tokens.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      // Only return user info, not tokens
      return res.status(201).json(response.success('User registered successfully', result.user));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthController();
