const { AppError } = require('../Utils/error.utils');
const jwt = require('../Utils/jwt.utils');
const { MESSAGES, TOKEN_TYPES } = require('../Utils/constant');
const User = require('../Models/user.model');


/**
 * Middleware để verify JWT token và thêm thông tin user vào request
 */
const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        const decoded = jwt.verifyToken(token, TOKEN_TYPES.ACCESS);
        req.user = { _id: decoded.userId };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware để kiểm tra role của user
 * @param {Array<string>} roles - Mảng các role được phép truy cập
 */
const checkRole = (roles) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);

            if (!user) {
                throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
            }

            if (!roles.includes(user.role)) {
                throw new AppError(MESSAGES.AUTH.FORBIDDEN, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    verifyToken,
    checkRole
}; 