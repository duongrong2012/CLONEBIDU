const User = require('../Models/user.model');
const { AppError } = require('../Utils/error.utils');
const { MESSAGES } = require('../Utils/constant');

/**
 * Service class for handling bookmark operations
 */
class BookmarkService {
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
}

module.exports = new BookmarkService();
