const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { MESSAGES } = require('../Utils/constant');
const Product = require('../Models/product.model');
const BaseService = require('./base.service');

/**
 * Service class for handling bookmark operations
 */
class BookmarkService extends BaseService {
  constructor() {
    super(Product);
  }
  /**
   * Add a product to user's bookmarks
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to bookmark
   * @returns {Promise<Object>} Updated user object with bookmarks
   */
  async addBookmark(userId, productId) {
    try {
      // Add product to user's bookmarks array
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { bookmarks: productId } }, // $addToSet prevents duplicates
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
      }

      return updatedUser.toPublicJSON();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to add bookmark', 500);
    }
  }

  /**
   * Remove a product from user's bookmarks
   * @param {string} userId - User ID
   * @param {string} productId - Product ID to remove
   * @returns {Promise<Object>} Updated user object with bookmarks
   */
  async removeBookmark(userId, productId) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { bookmarks: productId } },
        { new: true, runValidators: true }
      );
      if (!updatedUser) {
        throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
      }
      return updatedUser.toPublicJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to remove bookmark', 500);
    }
  }

  /**
   * Get paginated bookmarks for a user
   * @param {Object} user - User object (already validated)
   * @param {Object} query - Validated query params (page, limit, sortBy, sortOrder)
   * @returns {Promise<Object>} Paginated bookmarks (products)
   */
  async getBookmarks(user, query) {
    // Get bookmarked product IDs
    const bookmarkIds = user.bookmarks || [];
    // If no bookmarks, return empty result
    if (bookmarkIds.length === 0) {
      return {
        data: [],
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        total: 0,
        totalPages: 0,
      };
    }

    const paginateQuery = {
      ...query,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    };
    const result = await this.paginate(paginateQuery, { _id: { $in: bookmarkIds } });

    return result;
  }
}

module.exports = new BookmarkService();
