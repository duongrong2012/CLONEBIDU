const express = require('express');
const router = express.Router();
const userController = require('../Controllers/user.controller');
const { verifyToken, checkRole } = require('../Middlewares/auth.middleware');

// Protected routes
router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);

// Admin routes
router.get(
  '/:userId',
  verifyToken,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  userController.getUserById
);

module.exports = router;
