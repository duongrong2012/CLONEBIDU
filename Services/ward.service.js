const BaseService = require('./base.service');
const Ward = require('../Models/ward.model');

/**
 * WardService handles business logic for ward operations.
 * Extends BaseService for common CRUD and pagination.
 */
class WardService extends BaseService {
  constructor() {
    super(Ward);
  }

  /**
   * Get list of wards with optional pagination and parentCode filter
   * @param {object} options - Pagination options { page, limit, parentCode }
   * @returns {object} - { data, message }
   */
  async getWards({ page, limit, parentCode }) {
    const filter = {};
    if (parentCode) {
      filter.parent_code = parentCode;
    }
    const result = await this.paginate({ page, limit }, filter);
    return result;
  }
}

module.exports = new WardService();
