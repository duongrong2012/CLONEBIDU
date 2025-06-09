const express = require('express');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');
const sellerController = require('../Controllers/seller.controller');
const {
  validateSellerRequest,
  validatePaginationQuery,
  validateSellerRequestFilters,
  validateProcessSellerRequest,
  validateCancelSellerRequest,
} = require('../Middlewares/validation.middleware');
const router = express.Router();

// Routes for buyers
router.post(
  '/requests',
  verifyToken([USER_ROLES.BUYER]),
  validateSellerRequest,
  sellerController.submitSellerRequest
);

router.patch(
  '/requests/:requestId/cancel',
  verifyToken([USER_ROLES.BUYER]),
  validateCancelSellerRequest,
  sellerController.cancelSellerRequest
);

// Route for buyers/sellers to view their own requests
router.get(
  '/my-requests',
  verifyToken([USER_ROLES.BUYER, USER_ROLES.SELLER]),
  validatePaginationQuery(),
  validateSellerRequestFilters,
  sellerController.getMyRequests
);

// Routes for admins
router.get(
  '/all-requests',
  verifyToken([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  validatePaginationQuery(),
  validateSellerRequestFilters,
  sellerController.getSellerRequests
);

router.patch(
  '/requests/:requestId',
  verifyToken([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  validateProcessSellerRequest(),
  sellerController.processSellerRequest
);

module.exports = router;
