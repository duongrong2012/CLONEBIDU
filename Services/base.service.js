const { AppError } = require('../Utils/error.utils');
const validationUtils = require('../Utils/validation.utils');

class BaseService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Create a new record
   * @param {Object} data - Data to create
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    try {
      const record = await this.model.create(data);
      return record;
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Record already exists', 400);
      }
      throw error;
    }
  }

  /**
   * Get all records with optional filtering
   * @param {Object} query - Query parameters for filtering
   * @returns {Promise<Array>} Array of records
   */
  async getAll(query = {}) {
    const records = await this.model.find(query);
    return records;
  }

  /**
   * Get record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object>} Found record
   * @throws {AppError} If record not found
   */
  async getById(id) {
    const record = await this.model.findById(id);
    if (!record) {
      throw new AppError('Record not found', 404);
    }
    return record;
  }

  /**
   * Update record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated record
   * @throws {AppError} If record not found
   */
  async update(id, data) {
    const record = await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!record) {
      throw new AppError('Record not found', 404);
    }
    return record;
  }

  /**
   * Delete record by ID
   * @param {string} id - Record ID
   * @returns {Promise<void>}
   * @throws {AppError} If record not found
   */
  async delete(id) {
    const record = await this.model.findByIdAndDelete(id);
    if (!record) {
      throw new AppError('Record not found', 404);
    }
  }

  /**
   * Get paginated records with optional filtering and sorting
   * @param {Object} query - Query parameters for filtering and pagination
   * @param {Object} [query.page] - Page number
   * @param {Object} [query.limit] - Items per page
   * @param {Object} [query.sortBy] - Field to sort by
   * @param {Object} [query.sortOrder] - Sort order ('asc' or 'desc')
   * @param {Object} [filter={}] - Additional filter criteria
   * @returns {Promise<Object>} Paginated records with pagination info
   */
  async paginate(query = {}, filter = {}) {
    const { page, limit, sortBy, sortOrder } = validationUtils.validatePagination(query);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

module.exports = BaseService;
