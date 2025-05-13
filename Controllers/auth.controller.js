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

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body containing login credentials
   * @param {string} req.body.email - User's email
   * @param {string} req.body.password - User's password
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Response with user information
   */
  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // Set tokens in cookies
      res.cookie('accessToken', result.tokens.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.tokens.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      // Only return user info, not tokens
      return res.json(response.success('Login successful', result.user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} Response with success message
   */
  logout = async (req, res) => {
    // Remove both access token and refresh token
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json(response.success('Logged out successfully'));
  };

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from middleware
   * @param {string} req.user._id - User ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.oldPassword - Current password
   * @param {string} req.body.newPassword - New password
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Response with success message
   */
  changePassword = async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user._id, oldPassword, newPassword);

      return res.json(response.success(result.message));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   * @param {Object} req - Express request object
   * @param {Object} req.cookies - Cookies object
   * @param {string} req.cookies.refreshToken - Refresh token
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Response with success message
   */
  refreshToken = async (req, res, next) => {
    try {
      const refreshToken =
        req.cookies.refreshToken || req.headers['x-refresh-token'] || req.body.refreshToken;

      const result = await authService.refreshToken(refreshToken);

      // Set new access token in cookie
      res.cookie('accessToken', result.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      return res.json(response.success('Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthController();
