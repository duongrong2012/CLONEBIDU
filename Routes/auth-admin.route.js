const express = require('express');
const router = express.Router();
const authAdminController = require('../Controllers/auth-admin.controller');
const { verifyToken, checkRole } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Public routes
router.post('/login', authAdminController.login);
router.post('/refresh-token', authAdminController.refreshToken);
router.post('/logout', authAdminController.logout);

// Protected routes
router.get('/profile', verifyToken, checkRole([USER_ROLES.ADMIN]), authAdminController.getProfile);
router.put(
  '/profile',
  verifyToken,
  checkRole([USER_ROLES.ADMIN]),
  authAdminController.updateProfile
);
router.put(
  '/change-password',
  verifyToken,
  checkRole([USER_ROLES.ADMIN]),
  authAdminController.changePassword
);

module.exports = router;
