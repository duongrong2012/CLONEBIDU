const productService = require('../Services/product.service');
const response = require('../Utils/response.utils');

/**
 * Create a new product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createProduct = async (req, res) => {
  // Only use validated data from middleware
  const productData = req.validatedData;
  productData.createdBy = req.user._id;
  const product = await productService.createProduct(productData);
  return res.json(response.success(product));
};

/**
 * Get products with filters and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getProducts = async (req, res, next) => {
  try {
    const result = await productService.getProducts(req.validatedQuery);
    res.json(response.success('Products retrieved successfully', response.groupPagination(result)));
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProduct = async (req, res) => {
  // Only use validated data from middleware
  const { id } = req.params;
  const updateData = req.validatedData;
  const product = await productService.updateProduct(id, updateData);
  return res.json(response.success(product, 'Product updated successfully'));
};

/**
 * Get product detail by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { productId } = req.validatedParams;
    const product = await productService.getProductById(productId);
    res.json(response.success('Product retrieved successfully', product));
  } catch (error) {
    next(error);
  }
};
