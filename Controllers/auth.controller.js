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
   * Đăng nhập
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // Set tokens vào cookies
      res.cookie('accessToken', result.tokens.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.tokens.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      // Chỉ trả về thông tin user, không trả về tokens
      return res.json(response.success('Login successful', result.user));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đăng xuất
   */
  async logout(req, res) {
    // Xóa cả access token và refresh token
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json(response.success('Logged out successfully'));
  }

  /**
   * Đổi mật khẩu
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, oldPassword, newPassword);

      return res.json(response.success(result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const result = await authService.refreshToken(refreshToken);

      // Set access token mới vào cookie
      res.cookie('accessToken', result.accessToken, TOKEN_COOKIE_CONFIG.accessToken);

      return res.json(response.success('Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
