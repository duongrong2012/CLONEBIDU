const authService = require('../Services/auth.service');
const response = require('../Utils/response.utils');
const { TOKEN_COOKIE_CONFIG } = require('../Utils/constant');

class AuthController {
  /**
   * Đăng ký tài khoản mới
   */
  async register(req, res, next) {
    try {
      const userData = req.body;
      const result = await authService.register(userData);

      // Set tokens vào cookies
      res.cookie('accessToken', result.tokens.accessToken, TOKEN_COOKIE_CONFIG.accessToken);
      res.cookie('refreshToken', result.tokens.refreshToken, TOKEN_COOKIE_CONFIG.refreshToken);

      // Chỉ trả về thông tin user, không trả về tokens
      return res.status(201).json(response.success('User registered successfully', result.user));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
