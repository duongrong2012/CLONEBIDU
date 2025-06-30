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
const { validateAddBookmark } = require('../Middlewares');

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

module.exports = router;
