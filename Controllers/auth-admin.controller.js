const authAdminService = require('../Services/auth-admin.service');
const response = require('../Utils/response.utils');
const { TOKEN_COOKIE_CONFIG } = require('../Utils/constant');

class AuthAdminController {
  /**
   * Đăng nhập admin
   * @param {Object} req - Request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.email - Email của admin
   * @param {string} req.body.password - Mật khẩu của admin
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response với thông tin admin và tokens
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authAdminService.login(email, password);

      // Set tokens vào cookies
      res.cookie('accessToken', result.tokens.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.tokens.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      return res.json(response.success('Admin login successful', result.admin));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy thông tin profile admin
   * @param {Object} req - Request object
   * @param {Object} req.user - User object từ middleware
   * @param {string} req.user.id - ID của admin
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response với thông tin admin
   */
  async getProfile(req, res, next) {
    try {
      const admin = await authAdminService.getProfile(req.user.id);
      return res.json(response.success('Admin profile retrieved successfully', admin));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật thông tin profile admin
   * @param {Object} req - Request object
   * @param {Object} req.user - User object từ middleware
   * @param {string} req.user.id - ID của admin
   * @param {Object} req.body - Dữ liệu cập nhật
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response với thông tin admin đã cập nhật
   */
  async updateProfile(req, res, next) {
    try {
      const admin = await authAdminService.updateProfile(req.user.id, req.body);
      return res.json(response.success('Admin profile updated successfully', admin));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đổi mật khẩu admin
   * @param {Object} req - Request object
   * @param {Object} req.user - User object từ middleware
   * @param {string} req.user.id - ID của admin
   * @param {Object} req.body - Request body
   * @param {string} req.body.oldPassword - Mật khẩu cũ
   * @param {string} req.body.newPassword - Mật khẩu mới
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response thông báo đổi mật khẩu thành công
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await authAdminService.changePassword(req.user.id, oldPassword, newPassword);
      return res.json(response.success(result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đăng xuất admin
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} Response thông báo đăng xuất thành công
   */
  async logout(req, res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json(response.success('Admin logged out successfully'));
  }

  /**
   * Refresh access token cho admin
   * @param {Object} req - Request object
   * @param {Object} req.cookies - Cookies object
   * @param {string} req.cookies.refreshToken - Refresh token
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response thông báo refresh token thành công
   */
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const result = await authAdminService.refreshToken(refreshToken);

      res.cookie('accessToken', result.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      return res.json(response.success('Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthAdminController();
