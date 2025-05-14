const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');

// Public routes
router.post('/register', authController.register);

module.exports = router;
