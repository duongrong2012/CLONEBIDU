const ProductService = require('../Services/product.service');
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
  const product = await ProductService.createProduct(productData);
  return res.json(response.success(product));
};
