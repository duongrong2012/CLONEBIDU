const { AppError } = require('../Utils/error.utils');
const { generateToken } = require('../Utils/jwt.utils');
const { TOKEN_TYPES, MESSAGES } = require('../Utils/constant');
const validation = require('../Utils/validation.utils');
const User = require('../Models/user.model');
const jwt = require('jsonwebtoken');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    // Validate user input
    validation.validateUserFields(userData);

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400);
    }

    const user = await User.create({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      gender: userData.gender,
    });

    // Create tokens
    const accessToken = generateToken(user._id, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(user._id, TOKEN_TYPES.REFRESH);

    return {
      user: user.toPublicJSON(),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Đăng nhập với email và password
   */
  async login(email, password) {
    // Validate input
    validation.validateEmail(email);
    validation.validatePassword(password);

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, 403);
    }

    // Tạo tokens
    const accessToken = generateToken(user._id, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(user._id, TOKEN_TYPES.REFRESH);

    return {
      user: user.toPublicJSON(),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Đổi mật khẩu
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Validate new password
    validation.validatePassword(newPassword);

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    if (!(await user.comparePassword(oldPassword))) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    user.password = newPassword;
    await user.save();

    return { message: MESSAGES.AUTH.PASSWORD_CHANGED };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError(MESSAGES.AUTH.REFRESH_TOKEN_REQUIRED, 401);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Kiểm tra user có tồn tại và còn active
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
      }

      // Tạo access token mới
      const accessToken = generateToken(user._id, TOKEN_TYPES.ACCESS);

      return { accessToken };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(MESSAGES.AUTH.TOKEN_EXPIRED, 401);
      }
      throw new AppError(MESSAGES.AUTH.INVALID_TOKEN, 401);
    }
  }
}

module.exports = new AuthService();
