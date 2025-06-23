const { AppError } = require('../Utils/error.utils');
const { body, validationResult, param } = require('express-validator');
const Product = require('../Models/product.model');
const { MESSAGES, RATING } = require('../Utils/constant');

/**
 * Middleware to validate and filter rating product request
 * Validates:
 * - productId: required, valid ObjectId format
 * - rating: required, number between 1-5
 * - comment: optional, string max 500 characters
 * Business rules:
 * - Product must exist
 * - User can only rate once per product (or update existing rating)
 * @returns {Array} Array of validation middleware functions
 */
const validateRatingProduct = [
  param('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID format'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: RATING.MIN, max: RATING.MAX })
    .withMessage(`Rating must be an integer between ${RATING.MIN} and ${RATING.MAX}`),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: RATING.COMMENT_MAX_LENGTH })
    .withMessage(`Comment must not exceed ${RATING.COMMENT_MAX_LENGTH} characters`),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new AppError(errorMessages.join(', '), 400);
      }

      // Filter only validated fields
      const allowedFields = ['rating', 'comment'];
      const filteredData = {};

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          filteredData[field] = req.body[field];
        }
      });

      // Business: Check product exists
      const { productId } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError(MESSAGES.PRODUCT.NOT_FOUND, 404);
      }

      // Business: Check if product is active
      if (!product.isActive) {
        throw new AppError(MESSAGES.PRODUCT.INACTIVE_PRODUCT, 400);
      }

      // Add validated data to request for use in controller
      req.validatedData = {
        productId,
        rating: filteredData.rating,
        comment: filteredData.comment,
        userId: req.user._id,
      };

      next();
    } catch (error) {
      next(error);
    }
  },
];

module.exports = {
  validateRatingProduct,
};
