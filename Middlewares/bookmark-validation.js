const { param, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
const Product = require('../Models/product.model');
const User = require('../Models/user.model');
const { response } = require('../Utils/response.utils');
const { HTTP_STATUS, PRODUCT_STATUS, MESSAGES } = require('../Utils/constant');
const { AppError } = require('../Utils/error.utils');

/**
 * Combined middleware to validate add bookmark request
 * Handles all validations in one place:
 * - Validates productId parameter
 * - Checks if product exists and is active/approved
 * - Checks if user is not trying to bookmark their own product
 * - Checks if product is not already bookmarked
 */
const validateAddBookmark = [
  // Validate productId parameter
  param('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .custom(value => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid product ID format');
      }
      return true;
    }),

  // Check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(response.error('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array()));
    }
    next();
  },

  // Combined business logic validation
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const { user } = req;

      // Check if product exists and is valid
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError(MESSAGES.BOOKMARK.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      if (!product.isActive) {
        throw new AppError(MESSAGES.BOOKMARK.PRODUCT_INACTIVE, HTTP_STATUS.BAD_REQUEST);
      }

      if (product.status !== PRODUCT_STATUS.APPROVED) {
        throw new AppError(MESSAGES.BOOKMARK.PRODUCT_UNAPPROVED, HTTP_STATUS.BAD_REQUEST);
      }

      // Check if user is trying to bookmark their own product
      if (product.createdBy.toString() === user._id) {
        throw new AppError(MESSAGES.BOOKMARK.OWN_PRODUCT, HTTP_STATUS.BAD_REQUEST);
      }

      // Check if product is already bookmarked
      const userWithBookmarks = await User.findById(user._id);
      if (userWithBookmarks.bookmarks.includes(productId)) {
        throw new AppError(MESSAGES.BOOKMARK.ALREADY_BOOKMARKED, HTTP_STATUS.BAD_REQUEST);
      }

      // Store product in request for later use
      req.product = product;

      // Store validated data for controller
      req.validatedBookmarkData = {
        productId,
        userId: user._id,
        product,
      };
      next();
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Middleware validate remove bookmark
 * - Validate productId
 * - Check product exists
 * - Check product is in user's bookmarks
 * - Gán req.validatedBookmarkData
 */
const validateRemoveBookmark = [
  param('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .custom(value => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid product ID format');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array()));
    }
    next();
  },
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const { user } = req;
      // Check product exists
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError(MESSAGES.BOOKMARK.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
      // Check product is in user's bookmarks
      const userWithBookmarks = await User.findById(user._id);
      if (!userWithBookmarks.bookmarks.includes(productId)) {
        throw new AppError(MESSAGES.BOOKMARK.NOT_BOOKMARKED, HTTP_STATUS.BAD_REQUEST);
      }
      req.validatedBookmarkData = {
        productId,
        userId: user._id,
        product,
      };
      next();
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Middleware to validate and filter get bookmarks request (pagination, sort)
 * - Validate page, limit, sortBy, sortOrder
 * - Only allow valid fields, assign to req.validatedQuery
 * - Check if user exists, throw AppError if not
 */
const validateGetBookmarks = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isString().withMessage('SortBy must be a string'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be either asc or desc'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      return next(new AppError(errorMessages.join(', '), 400));
    }
    // Only allow valid fields
    const allowedFields = ['page', 'limit', 'sortBy', 'sortOrder'];
    const filteredQuery = {};
    allowedFields.forEach(field => {
      if (req.query[field] !== undefined) {
        filteredQuery[field] = req.query[field];
      }
    });
    // Check if user exists
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    req.validatedQuery = filteredQuery;
    req.validatedUser = user;
    next();
  },
];

module.exports = {
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
};
