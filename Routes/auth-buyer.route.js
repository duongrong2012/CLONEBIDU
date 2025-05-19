const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const { validateUserFields } = require('../Middlewares');

// API documentation available in OpenApi/auth/register.yaml
router.post('/register', validateUserFields, authController.register);

module.exports = router;
