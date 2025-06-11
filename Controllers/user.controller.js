const userService = require('../Services/user.service');
const response = require('../Utils/response.utils');

/**
 * Get users with pagination and filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query);
    res.json(response.success('Users retrieved successfully', response.groupPagination(result)));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
};
