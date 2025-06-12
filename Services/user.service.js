const BaseService = require('./base.service');
const User = require('../Models/user.model');

class AdminService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Get users with pagination and filters
   * @param {Object} query - Query parameters
   * @param {number} query.page - Page number
   * @param {number} query.limit - Items per page
   * @param {string} query.name - Search by name
   * @param {string} query.role - Filter by role
   * @param {string} query.isActive - Filter by active status
   * @param {string} query.sortBy - Sort field
   * @param {string} query.sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} Paginated users data
   */
  async getUsers(query) {
    const { name, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    // Build filter
    const filter = {};
    if (name) {
      filter.$or = [
        { firstName: { $regex: name, $options: 'i' } },
        { lastName: { $regex: name, $options: 'i' } },
        { email: { $regex: name, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: name,
              options: 'i',
            },
          },
        },
      ];
    }
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Use base service pagination
    return this.paginate(
      {
        sort,
        select: '-password',
        ...query,
      },
      filter
    );
  }

  /**
   * Update user information by admin
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @param {string} [updateData.email] - New email
   * @param {string} [updateData.password] - New password
   * @param {boolean} [updateData.isActive] - Active status
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(id, updateData) {
    // Find user (assume validation already done in middleware)
    const user = await this.model.findById(id);

    // Update fields
    if (updateData.email) user.email = updateData.email;
    if (updateData.password) user.password = updateData.password;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

    // Save to trigger pre('save')
    await user.save();

    // Return public user info
    return user.toPublicJSON();
  }
}

module.exports = new AdminService();
