const response = require('../Utils/response.utils');

class BaseController {
  constructor(service) {
    this.service = service;
  }

  /**
   * Create a new record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  create = async (req, res, next) => {
    try {
      const result = await this.service.create(req.body);
      return res.status(201).json(response.success('Created successfully', result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getAll = async (req, res, next) => {
    try {
      const result = await this.service.getAll(req.query);
      return res.json(response.success('Retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getById = async (req, res, next) => {
    try {
      const result = await this.service.getById(req.params.id);
      return res.json(response.success('Retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  update = async (req, res, next) => {
    try {
      const result = await this.service.update(req.params.id, req.body);
      return res.json(response.success('Updated successfully', result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  delete = async (req, res, next) => {
    try {
      await this.service.delete(req.params.id);
      return res.json(response.success('Deleted successfully'));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = BaseController;
