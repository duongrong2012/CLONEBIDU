const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const { verifyToken, verifyRefreshToken } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post(
  '/refresh-token',
  verifyRefreshToken([USER_ROLES.BUYER, USER_ROLES.SELLER]),
  authController.refreshToken
);

// Protected routes
router.post('/logout', verifyToken([USER_ROLES.BUYER, USER_ROLES.SELLER]), authController.logout);
router.post(
  '/change-password',
  verifyToken([USER_ROLES.BUYER, USER_ROLES.SELLER]),
  authController.changePassword
);

module.exports = router;
