const Product = require('../Models/product.model');

/**
 * Create a new product
 * @param {Object} productData - Validated product data
 * @returns {Promise<Object>} Created product
 */
exports.createProduct = async productData => {
  const product = await Product.create(productData);
  return product;
};
