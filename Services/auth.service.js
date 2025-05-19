const { AppError } = require('../Utils/error.utils');
const { MESSAGES } = require('../Utils/constant');
const User = require('../Models/user.model');
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
}

module.exports = new AuthService();
