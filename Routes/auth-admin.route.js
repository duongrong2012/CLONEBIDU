const express = require('express');
const router = express.Router();
const authAdminController = require('../Controllers/auth-admin.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Public routes
router.post('/login', authAdminController.login);
router.post('/refresh-token', authAdminController.refreshToken);

// Protected routes (Admin only)
router.post(
  '/logout',
  verifyToken([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  authAdminController.logout
);

module.exports = router;
