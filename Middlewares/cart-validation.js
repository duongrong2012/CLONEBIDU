const { isValidObjectId } = require('mongoose');
const Product = require('../Models/product.model');
const { AppError } = require('../Utils/error.utils');
const { PRODUCT_STATUS } = require('../Utils/constant');
const Cart = require('../Models/cart.model');

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

/**
 * Middleware validate and filter query params for get cart API
 * Only allows page, limit, sortBy, sortOrder; throws AppError for invalid values
 */
const validateGetCart = (req, res, next) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const allowedSortBy = ['createdAt', 'updatedAt'];
  const allowedSortOrder = ['asc', 'desc', 'ascending', 'descending', 1, -1];

  if (isNaN(parsedPage) || parsedPage < 1) {
    return next(new AppError('Invalid page parameter', 400));
  }
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return next(new AppError('Invalid limit parameter', 400));
  }
  if (!allowedSortBy.includes(sortBy)) {
    return next(new AppError('Invalid sortBy parameter', 400));
  }
  if (!allowedSortOrder.includes(sortOrder)) {
    return next(new AppError('Invalid sortOrder parameter', 400));
  }

  req.validatedQuery = {
    page: parsedPage,
    limit: parsedLimit,
    sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'ascending' || sortOrder === 1 ? 'asc' : 'desc',
  };
  next();
};

/**
 * Middleware validate remove product from cart
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
const validateRemoveFromCart = async (req, res, next) => {
  try {
    let { productIds } = req.body;
    if (!productIds) {
      return next(new AppError('productIds is required', 400));
    }
    if (!Array.isArray(productIds)) {
      productIds = [productIds];
    }
    if (productIds.length === 0) {
      return next(new AppError('productIds must be a non-empty array', 400));
    }
    // Check duplicate productIds
    const seen = new Set();
    for (const id of productIds) {
      if (!isValidObjectId(id)) {
        return next(new AppError(`Invalid product id: ${id}`, 400));
      }
      if (seen.has(id)) {
        return next(new AppError('Duplicate product id in productIds', 400));
      }
      seen.add(id);
    }
    // Kiểm tra tất cả productIds phải tồn tại trong cart của user
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart || !cart.products || cart.products.length === 0) {
      return next(new AppError('Cart is empty', 400));
    }
    const cartProductIds = cart.products.map(item => item.product.toString());
    const notFound = productIds.filter(id => !cartProductIds.includes(id));
    if (notFound.length > 0) {
      return next(new AppError(`Product(s) not found in cart: ${notFound.join(', ')}`, 400));
    }
    req.validatedData = { productIds };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validateAddCart, validateGetCart, validateRemoveFromCart };
