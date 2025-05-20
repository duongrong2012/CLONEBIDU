const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const { validateUserFields, validateBuyerLogin } = require('../Middlewares');

// API documentation available in OpenApi/auth/register.yaml
router.post('/register', validateUserFields, authController.register);

// API documentation available in OpenApi/auth/login.yaml
router.post('/login', validateBuyerLogin, authController.login);

module.exports = router;
