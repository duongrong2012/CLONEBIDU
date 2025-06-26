const BaseService = require('./base.service');
const Product = require('../Models/product.model');
const AppError = require('../Utils/error.utils');
const ProductRating = require('../Models/product-rating.model');
const { MESSAGES } = require('../Utils/constant');

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
    if (query.status) filter.status = query.status;
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

  /**
   * Get a product by ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Product details
   */
  async getProductById(productId) {
    const product = await Product.findById(productId)
      .populate('categories', 'name slug')
      .populate('createdBy', 'firstName lastName email');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return product;
  }

  /**
   * Rate a product by user
   * @param {Object} ratingData - Validated rating data from middleware
   * @param {string} ratingData.productId - Product ID
   * @param {string} ratingData.userId - User ID
   * @param {number} ratingData.rating - Rating value (1-5)
   * @param {string} ratingData.comment - Optional comment
   * @returns {Promise<Object>} Updated product with new rating
   */
  async rateProduct(ratingData) {
    const { productId, userId, rating, comment } = ratingData;

    // Use transaction to ensure data consistency
    const session = await Product.startSession();
    session.startTransaction();

    try {
      // Check if user has already rated this product
      let existingRating = await ProductRating.findOne({
        product: productId,
        user: userId,
      }).session(session);

      let isNewRating = true;

      if (existingRating) {
        isNewRating = false;

        // Update existing rating
        existingRating.rating = rating;
        existingRating.comment = comment;

        // Update the user's rating in ratedUsers array
        const userIndex = existingRating.ratedUsers.findIndex(ru => ru.user.toString() === userId);

        if (userIndex !== -1) {
          existingRating.ratedUsers[userIndex].rating = rating;
          existingRating.ratedUsers[userIndex].comment = comment;
          existingRating.ratedUsers[userIndex].ratedAt = new Date();
        }

        await existingRating.save({ session });
      } else {
        // Create new rating
        existingRating = await ProductRating.create(
          [
            {
              product: productId,
              user: userId,
              rating,
              comment,
              ratedUsers: [
                {
                  user: userId,
                  rating,
                  comment,
                  ratedAt: new Date(),
                },
              ],
            },
          ],
          { session }
        );

        existingRating = existingRating[0];
      }

      // Calculate new average rating for product
      const ratings = await ProductRating.find({ product: productId }).session(session);
      const totalRating = ratings.length;
      const totalRatingPoints = ratings.reduce((sum, r) => sum + r.rating, 0);

      // Update product rating fields
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          totalRating,
          totalRatingPoints,
        },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new AppError(MESSAGES.PRODUCT.NOT_FOUND, 404);
      }

      // Commit transaction
      await session.commitTransaction();

      return {
        product: updatedProduct,
        rating: existingRating,
        isNewRating,
      };
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  }
}

module.exports = new ProductService();
