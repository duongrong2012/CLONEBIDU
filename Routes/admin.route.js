const express = require('express');
const router = express.Router();
const adminController = require('../Controllers/admin.controller');
const { verifyToken, checkRole } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Routes that require authentication and admin role
router.use(verifyToken([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]));

// Profile management routes (accessible by both ADMIN and SUPER_ADMIN)
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);

// Super admin only routes
router.get('/', checkRole([USER_ROLES.SUPER_ADMIN]), adminController.getAllAdmins);
router.post('/', checkRole([USER_ROLES.SUPER_ADMIN]), adminController.createAdmin);
router.patch(
  '/:id/deactivate',
  checkRole([USER_ROLES.SUPER_ADMIN]),
  adminController.deactivateAdmin
);

module.exports = router;
