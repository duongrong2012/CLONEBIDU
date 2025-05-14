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

      // Set tokens in cookies
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: TOKEN_COOKIE_CONFIG.accessToken.maxAge,
      });

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: TOKEN_COOKIE_CONFIG.refreshToken.maxAge,
      });

      // Only return user information, not tokens
      return res.status(201).json(response.success('User registered successfully', result.user));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
