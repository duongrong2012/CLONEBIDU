const adminService = require('../Services/admin.service');
const response = require('../Utils/response.utils');
const BaseController = require('./base.controller');

class AdminController extends BaseController {
  constructor() {
    super(adminService);
  }

  /**
   * Get admin profile
   * @param {Object} req - Request object
   * @param {Object} req.user - User object from middleware
   * @param {string} req.user.id - Admin ID
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with admin info
   */
  getProfile = async (req, res, next) => {
    try {
      const admin = await this.service.getProfile(req.user._id);

      return res.json(response.success('Admin profile retrieved successfully', admin));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update admin profile
   * @param {Object} req - Request object
   * @param {Object} req.user - User object from middleware
   * @param {string} req.user.id - Admin ID
   * @param {Object} req.body - Update data
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with updated admin info
   */
  updateProfile = async (req, res, next) => {
    try {
      const admin = await this.service.updateProfile(req.user.id, req.body);
      return res.json(response.success('Admin profile updated successfully', admin));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all admins (Super Admin only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with list of admins
   */
  getAllAdmins = async (req, res, next) => {
    try {
      const admins = await this.service.getAllAdmins();
      return res.json(response.success('Admins retrieved successfully', admins));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new admin (Super Admin only)
   * @param {Object} req - Request object
   * @param {Object} req.body - Admin data
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with created admin info
   */
  createAdmin = async (req, res, next) => {
    try {
      const admin = await this.service.createAdmin(req.body);
      return res.status(201).json(response.success('Admin created successfully', admin));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deactivate admin account (Super Admin only)
   * @param {Object} req - Request object
   * @param {string} req.params.id - Admin ID
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   * @returns {Object} Response with success message
   */
  deactivateAdmin = async (req, res, next) => {
    try {
      await this.service.deactivateAdmin(req.params.id);
      return res.json(response.success('Admin deactivated successfully'));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AdminController();
