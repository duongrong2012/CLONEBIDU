const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const jwt = require('../Utils/jwt.utils');

class UserService {
  /**
   * Đăng ký user mới
   */
  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }

    const user = await User.create(userData);
    return user.toPublicJSON();
  }

  /**
   * Lấy thông tin user theo ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user.toPublicJSON();
  }

  /**
   * Cập nhật thông tin user
   */
  async updateUser(userId, updateData) {
    // Không cho phép cập nhật email và password qua method này
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user.toPublicJSON();
  }
}

module.exports = new UserService();
