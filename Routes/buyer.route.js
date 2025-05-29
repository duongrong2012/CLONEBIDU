const express = require('express');
const router = express.Router();
const buyerController = require('../Controllers/buyer.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { validateUpdateProfile } = require('../Middlewares/validation.middleware');

// Protected routes
router.get('/profile', verifyToken(), buyerController.getProfile);
router.patch('/profile', validateUpdateProfile, buyerController.updateProfile);

module.exports = router;
