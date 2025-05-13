const express = require('express');
const router = express.Router();
const userController = require('../Controllers/user.controller');
const { verifyToken, checkRole } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Protected routes
router.get(
  '/profile',
  verifyToken([USER_ROLES.BUYER, USER_ROLES.SELLER]),
  userController.getProfile
);
router.put(
  '/profile',
  verifyToken([USER_ROLES.BUYER, USER_ROLES.SELLER]),
  userController.updateProfile
);

// Admin routes
router.get(
  '/:userId',
  verifyToken,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  userController.getUserById
);

module.exports = router;
