const { AppError } = require('../Utils/error.utils');
const { generateToken, verifyToken } = require('../Utils/jwt.utils');
const { TOKEN_TYPES, MESSAGES, USER_ROLES } = require('../Utils/constant');
const validation = require('../Utils/validation.utils');
const User = require('../Models/user.model');
const bcrypt = require('bcrypt');

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
   * Login with email and password
   */
  async login(email, password) {
    // Validate email format
    validation.validateEmail(email);

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
    const accessToken = generateToken(user._id, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(user._id, TOKEN_TYPES.REFRESH);

    return {
      user: user.toPublicJSON(),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Validate new password
    validation.validatePassword(newPassword);

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

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const decoded = verifyToken(refreshToken, TOKEN_TYPES.REFRESH);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
    }

    // Check if user is not admin
    if ([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id, TOKEN_TYPES.ACCESS);
    const newRefreshToken = generateToken(user._id, TOKEN_TYPES.REFRESH);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

module.exports = new AuthService();
