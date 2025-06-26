const express = require('express');
const router = express.Router();
const { verifyToken, optionalAuth } = require('../Middlewares/auth.middleware');
const {
  validateGetUsers,
  validateUpdateUser,
  validateCreateCategory,
  validateUpdateCategory,
  validateCreateProduct,
  validateGetProducts,
  validateUpdateProduct,
  validateGetProductById,
} = require('../Middlewares/validation.middleware');
const { getUsers, updateUser } = require('../Controllers/user.controller');
const { createCategory, updateCategory } = require('../Controllers/category.controller');
const {
  createProduct,
  getProducts,
  updateProduct,
  getProductById,
} = require('../Controllers/product.controller');
const { USER_ROLES } = require('../Utils/constant');

router.get('/users', verifyToken(USER_ROLES.SUPER_ADMIN), validateGetUsers(), getUsers);
router.patch(
  '/users/:id',
  verifyToken([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
  validateUpdateUser(),
  updateUser
);

// Category routes
router.post(
  '/categories',
  verifyToken([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
  validateCreateCategory(),
  createCategory
);

router.patch('/categories/:id', validateUpdateCategory(), updateCategory);

// Product routes
router.post(
  '/products',
  verifyToken([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SELLER]),
  validateCreateProduct,
  createProduct
);

router.get('/products', optionalAuth, validateGetProducts, getProducts);

router.get('/products/:productId', optionalAuth, validateGetProductById, getProductById);

router.patch(
  '/products/:id',
  verifyToken([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SELLER]),
  validateUpdateProduct,
  updateProduct
);

module.exports = router;
