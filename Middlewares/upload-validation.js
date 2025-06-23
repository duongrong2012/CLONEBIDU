const { param, body, validationResult } = require('express-validator');
const Media = require('../Models/media.model');
const Product = require('../Models/product.model');
const { IMAGE_OWNER_TYPE } = require('../Utils/constant');
const { AppError } = require('../Utils/error.utils');

/**
 * Middleware to validate and process upload product images
 * - Validates productId (params) and mediaIds (body)
 * - Checks all media exist, are not owned by another entity, and are not already linked to another product
 * - Checks product exists
 * - Updates media ownerType/ownerId
 * - Passes validated data to controller
 * - Handles all errors (validation, business, not found, etc.)
 */
const validateUploadProductImages = [
  param('productId').isMongoId().withMessage('Invalid product ID format'),
  body('mediaIds').isArray({ min: 1 }).withMessage('mediaIds must be a non-empty array'),
  body('mediaIds.*').isMongoId().withMessage('Each mediaId must be a valid ObjectId'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return next(new AppError(errorMessages.join(', '), 400));
      }
      const { productId } = req.params;
      const { mediaIds } = req.body;
      // Check product exists
      const product = await Product.findById(productId);
      if (!product) {
        return next(new AppError('Product not found', 404));
      }
      // Check duplicate mediaIds
      const uniqueMediaIds = new Set(mediaIds.map(String));
      if (uniqueMediaIds.size !== mediaIds.length) {
        return next(new AppError('Duplicate mediaId in mediaIds array', 400));
      }
      // Check all media exist
      const medias = await Media.find({ _id: { $in: mediaIds } });
      if (medias.length !== mediaIds.length) {
        return next(new AppError('One or more media not found', 404));
      }
      // Check media ownership
      for (const media of medias) {
        if (media.ownerType && media.ownerType !== IMAGE_OWNER_TYPE.PRODUCT) {
          return next(new AppError('Media is already owned by another entity', 400));
        }
        if (media.ownerId && media.ownerId.toString() !== productId) {
          return next(new AppError('Media is already owned by another product', 400));
        }
      }
      // Chuẩn bị dữ liệu validated cho controller
      req.validatedData = {
        product,
        mediaIds,
        medias,
      };
      next();
    } catch (error) {
      next(error);
    }
  },
];

module.exports = {
  validateUploadProductImages,
};
