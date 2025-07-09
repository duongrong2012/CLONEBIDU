const BaseService = require('./base.service');
const Province = require('../Models/province.model');
const { groupPagination } = require('../Utils/response.utils');

/**
 * ProvinceService handles business logic for province operations.
 * Extends BaseService for common CRUD and pagination.
 */
class ProvinceService extends BaseService {
  constructor() {
    super(Province);
  }

  /**
   * Get list of provinces with optional pagination
   * @param {object} options - Pagination options { page, limit }
   * @returns {object} - { data, message }
   */
  async getProvinces({ page, limit }) {
    const result = await this.paginate({ page, limit }, {});
    return {
      data: groupPagination(result),
      message: 'Get provinces successfully',
    };
  }
}

module.exports = new ProvinceService();
