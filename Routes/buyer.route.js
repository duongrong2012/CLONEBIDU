const express = require('express');
const router = express.Router();
const buyerController = require('../Controllers/buyer.controller');
const bookmarkController = require('../Controllers/bookmark.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { validateUpdateProfile } = require('../Middlewares/validation.middleware');
const { getCategories } = require('../Controllers/category.controller');
const { validateGetCategories } = require('../Middlewares/validation.middleware');
const { validateRatingProduct } = require('../Middlewares/product-validation.middleware');
const { rateProduct } = require('../Controllers/product.controller');
const {
  validateAddBookmark,
  validateRemoveBookmark,
  validateGetBookmarks,
} = require('../Middlewares');
const cartController = require('../Controllers/cart.controller');
const {
  validateAddCart,
  validateGetCart,
  validateRemoveFromCart,
} = require('../Middlewares/cart-validation');

// Protected routes
router.get('/profile', verifyToken(), buyerController.getProfile);
router.patch('/profile', verifyToken(), validateUpdateProfile, buyerController.updateProfile);

// Get categories
router.get('/categories', validateGetCategories(), getCategories);

// Product rating route
router.post('/products/:productId/rate', verifyToken(), validateRatingProduct, rateProduct);

// Bookmark routes - available for all roles
router.post(
  '/products/:productId/bookmark',
  verifyToken(),
  validateAddBookmark,
  bookmarkController.addBookmark
);

// Remove bookmark route
router.delete(
  '/products/:productId/bookmark',
  verifyToken(),
  validateRemoveBookmark,
  bookmarkController.removeBookmark
);

// Get bookmarks route
router.get('/bookmarks', verifyToken(), validateGetBookmarks, bookmarkController.getBookmarks);

// Add cart route
router.post('/cart', verifyToken(), validateAddCart, cartController.addCart);

// Get paginated cart
router.get('/cart', verifyToken(), validateGetCart, cartController.getCart);

// Remove products from cart
router.delete('/cart', verifyToken(), validateRemoveFromCart, cartController.removeFromCart);

module.exports = router;
