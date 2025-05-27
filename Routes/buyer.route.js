const express = require('express');
const router = express.Router();
const buyerController = require('../Controllers/buyer.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');

// Protected routes
router.get('/profile', verifyToken(), buyerController.getProfile);

module.exports = router;
