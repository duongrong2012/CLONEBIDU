const authAdminService = require('../Services/auth-admin.service');
const response = require('../Utils/response.utils');
const { TOKEN_COOKIE_CONFIG } = require('../Utils/constant');

class AuthAdminController {
  /**
   * Admin login
   * @param {Object} req - Request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.email - Admin email
   * @param {string} req.body.password - Admin password
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with admin info and tokens
   */
  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const result = await authAdminService.login(email, password);

      // Set tokens in cookies
      res.cookie('accessToken', result.tokens.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.tokens.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      return res.json(response.success('Admin login successful', result.admin));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin logout
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} Response with success message
   */
  logout = async (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json(response.success('Admin logged out successfully'));
  };

  /**
   * Refresh admin access token
   * @param {Object} req - Request object
   * @param {Object} req.cookies - Cookies object
   * @param {string} req.cookies.refreshToken - Refresh token
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with success message
   */
  refreshToken = async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      const result = await authAdminService.refreshToken(refreshToken);

      res.cookie('accessToken', result.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      return res.json(response.success('Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthAdminController();
