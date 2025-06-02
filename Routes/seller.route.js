const express = require('express');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');
const sellerController = require('../Controllers/seller.controller');
const { validateSellerRequest } = require('../Middlewares/validation.middleware');
const router = express.Router();

// Routes for buyers
router.post(
  '/requests',
  verifyToken([USER_ROLES.BUYER]),
  validateSellerRequest,
  sellerController.submitSellerRequest
);

module.exports = router;
