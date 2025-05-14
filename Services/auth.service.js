const { AppError } = require('../Utils/error.utils');
const { generateToken } = require('../Utils/jwt.utils');
const { TOKEN_TYPES, MESSAGES } = require('../Utils/constant');
const validation = require('../Utils/validation.utils');
const User = require('../Models/user.model');
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
}

module.exports = new AuthService();
