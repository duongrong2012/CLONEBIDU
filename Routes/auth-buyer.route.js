const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const { validateUserFields, validateBuyerLogin, verifyRefreshToken } = require('../Middlewares');

// API documentation available in OpenApi/auth/register.yaml
router.post('/register', validateUserFields, authController.register);

// API documentation available in OpenApi/auth/login.yaml
router.post('/login', validateBuyerLogin, authController.login);

// API documentation available in OpenApi/auth/refresh-token.yaml
router.post('/refresh-token', verifyRefreshToken(), authController.refreshToken);

module.exports = router;
