const express = require('express');
const router = express.Router();
const { verifyToken } = require('../Middlewares/auth.middleware');
const {
  validateGetUsers,
  validateUpdateUser,
  validateCreateCategory,
  validateUpdateCategory,
  validateCreateProduct,
  validateGetProducts,
} = require('../Middlewares/validation.middleware');
const { getUsers, updateUser } = require('../Controllers/user.controller');
const { createCategory, updateCategory } = require('../Controllers/category.controller');
const { createProduct, getProducts } = require('../Controllers/product.controller');
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

router.post(
  '/products',
  verifyToken([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SELLER]),
  validateCreateProduct,
  createProduct
);

router.get('/products', validateGetProducts, getProducts);

module.exports = router;
