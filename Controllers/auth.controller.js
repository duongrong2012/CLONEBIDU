const authService = require('../Services/auth.service');
const { TOKEN_TYPES, JWT_CONFIG } = require('../Utils/constant');
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

      return res.json(
        response.success('Login successful', {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          tokenType: TOKEN_TYPES.BEARER,
          expiresIn: JWT_CONFIG.ACCESS_TOKEN.EXPIRES_IN,
        })
      );
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuthController();
