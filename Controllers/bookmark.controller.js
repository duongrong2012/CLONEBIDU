const bookmarkService = require('../Services/bookmark.service');
const { catchAsync } = require('../Utils/error.utils');
const response = require('../Utils/response.utils');
const { MESSAGES } = require('../Utils/constant');

/**
 * Controller class for handling bookmark operations
 */
class BookmarkController {
  /**
   * Add a product to user's bookmarks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} _next - Express next middleware function
   */
  addBookmark = catchAsync(async (req, res, _next) => {
    const { productId, userId } = req.validatedBookmarkData;

    const updatedUser = await bookmarkService.addBookmark(userId, productId);

    res.status(201).json(
      response.success(MESSAGES.BOOKMARK.ADDED_SUCCESS, {
        bookmarks: updatedUser.bookmarks,
        totalBookmarks: updatedUser.bookmarks.length,
      })
    );
  });
}

module.exports = new BookmarkController();
