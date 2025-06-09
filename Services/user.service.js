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
}

module.exports = new AdminService();
