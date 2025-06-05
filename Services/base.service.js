const { AppError } = require('../Utils/error.utils');

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
   * Get request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Found request
   * @throws {AppError} If request not found
   */
  async getRequestById(requestId) {
    const request = await this.getById(requestId);
    return request;
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
}

module.exports = BaseService;
