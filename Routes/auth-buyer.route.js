const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.post('/logout', verifyToken, authController.logout);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router; 