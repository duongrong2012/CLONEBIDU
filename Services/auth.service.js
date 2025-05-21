const bcrypt = require('bcrypt');

const { AppError } = require('../Utils/error.utils');
const { MESSAGES, TOKEN_TYPES } = require('../Utils/constant');
const User = require('../Models/user.model');
const { generateToken } = require('../Utils/jwt.utils');
const validationUtils = require('../Utils/validation.utils');
class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
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

    return {
      user: user.toPublicJSON(),
    };
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Generate tokens
    const accessToken = generateToken(user, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(user, TOKEN_TYPES.REFRESH);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(user) {
    // Generate new tokens
    const newAccessToken = generateToken(user, TOKEN_TYPES.ACCESS);

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Validate new password
    validationUtils.validatePassword(newPassword);

    if (oldPassword === newPassword) {
      throw new AppError(MESSAGES.AUTH.PASSWORD_DUPLICATE, 400);
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_PASSWORD, 401);
    }

    user.password = newPassword;
    await user.save();

    return { message: MESSAGES.AUTH.PASSWORD_CHANGED };
  }
}

module.exports = new AuthService();
