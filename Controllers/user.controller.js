const userService = require('../Services/user.service');
const response = require('../Utils/response.utils');

class UserController {
    /**
     * Lấy thông tin user hiện tại
     */
    async getProfile(req, res, next) {
        try {
            const user = await userService.getUserById(req.user._id);
            return res.json(
                response.success('Profile retrieved successfully', user)
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cập nhật thông tin user
     */
    async updateProfile(req, res, next) {
        try {
            const updateData = req.body;
            const user = await userService.updateUser(req.user._id, updateData);
            return res.json(
                response.success('Profile updated successfully', user)
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy thông tin user theo ID (Admin only)
     */
    async getUserById(req, res, next) {
        try {
            const { userId } = req.params;
            const user = await userService.getUserById(userId);
            return res.json(
                response.success('User retrieved successfully', user)
            );
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController(); 