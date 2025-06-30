const { param, validationResult } = require('express-validator');
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

module.exports = {
  validateAddBookmark,
};
