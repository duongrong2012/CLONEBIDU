const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const {
  validateUserFields,
  validateBuyerLogin,
  validateSocialLogin,
  validateForgotPassword,
  forgotPasswordRateLimit,
  validateResetPassword,
  verifyRefreshToken,
} = require('../Middlewares');
const { verifyToken } = require('../Middlewares/auth.middleware');

// API documentation available in OpenApi/auth/register.yaml
router.post('/register', validateUserFields, authController.register);

// API documentation available in OpenApi/auth/login.yaml
router.post('/login', validateBuyerLogin, authController.login);

// API documentation available in OpenApi/auth/social-login.yaml
router.post('/social-login', validateSocialLogin, authController.socialLogin);

// API documentation available in OpenApi/auth/forgot-password.yaml
router.post(
  '/forgot-password',
  validateForgotPassword,
  forgotPasswordRateLimit,
  authController.forgotPassword
);

// API documentation available in OpenApi/auth/reset-password.yaml
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// API documentation available in OpenApi/auth/refresh-token.yaml
router.post('/refresh-token', verifyRefreshToken(), authController.refreshToken);

// API documentation available in OpenApi/auth/change-password.yaml
router.post('/change-password', verifyToken(), authController.changePassword);

module.exports = router;
