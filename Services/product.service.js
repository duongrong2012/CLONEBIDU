const BaseService = require('./base.service');
const Product = require('../Models/product.model');

class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  /**
   * Get products with filters and pagination
   * @param {Object} query - Validated query params
   * @returns {Promise<Object>} Paginated products
   */
  async getProducts(query) {
    const filter = {};
    // Name filter (case/diacritic sensitive as default)
    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' };
    }
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      filter.price = {};
      if (query.priceMin !== undefined) filter.price.$gte = Number(query.priceMin);
      if (query.priceMax !== undefined) filter.price.$lte = Number(query.priceMax);
    }
    if (query.discountPriceMin !== undefined || query.discountPriceMax !== undefined) {
      filter.discountPrice = {};
      if (query.discountPriceMin !== undefined)
        filter.discountPrice.$gte = Number(query.discountPriceMin);
      if (query.discountPriceMax !== undefined)
        filter.discountPrice.$lte = Number(query.discountPriceMax);
    }
    if (query.isActive !== undefined)
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    if (query.isFeatured !== undefined)
      filter.isFeatured = query.isFeatured === 'true' || query.isFeatured === true;
    if (query.categories) filter.categories = { $in: query.categories };
    if (query.createdBy) filter.createdBy = query.createdBy;
    if (query.quantityMin !== undefined || query.quantityMax !== undefined) {
      filter.quantity = {};
      if (query.quantityMin !== undefined) filter.quantity.$gte = Number(query.quantityMin);
      if (query.quantityMax !== undefined) filter.quantity.$lte = Number(query.quantityMax);
    }
    if (query.createdAtFrom || query.createdAtTo) {
      filter.createdAt = {};
      if (query.createdAtFrom) filter.createdAt.$gte = new Date(query.createdAtFrom);
      if (query.createdAtTo) filter.createdAt.$lte = new Date(query.createdAtTo);
    }
    if (query.updatedAtFrom || query.updatedAtTo) {
      filter.updatedAt = {};
      if (query.updatedAtFrom) filter.updatedAt.$gte = new Date(query.updatedAtFrom);
      if (query.updatedAtTo) filter.updatedAt.$lte = new Date(query.updatedAtTo);
    }
    return this.paginate(query, filter);
  }

  /**
   * Create a new product
   * @param {Object} productData - Validated product data
   * @returns {Promise<Object>} Created product
   */
  async createProduct(productData) {
    const product = await Product.create(productData);
    return product;
  }

  /**
   * Update a product by ID
   * @param {string} productId - Product ID
   * @param {Object} updateData - Validated update data
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(productId, updateData) {
    const product = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    });
    return product;
  }
}

module.exports = new ProductService();
