const { isValidObjectId } = require('mongoose');
const Product = require('../Models/product.model');
const { AppError } = require('../Utils/error.utils');
const { PRODUCT_STATUS } = require('../Utils/constant');

/**
 * Middleware to validate add cart request
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
const validateAddCart = async (req, res, next) => {
  try {
    const { product, quantity } = req.body;

    // Validate product id
    if (!product || !isValidObjectId(product)) {
      return next(new AppError('Invalid product id', 400));
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 1) {
      return next(new AppError('Quantity must be a positive integer', 400));
    }

    // Check product existence and status
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return next(new AppError('Product not found', 404));
    }

    if (productDoc.status !== PRODUCT_STATUS.APPROVED || !productDoc.isActive) {
      return next(new AppError('Product must be approved and active to add to cart', 400));
    }

    req.validatedData = { product, quantity };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validateAddCart };
