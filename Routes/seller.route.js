const express = require('express');
const router = express.Router();
const sellerController = require('../Controllers/seller.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Routes for buyers
router.post('/requests', verifyToken([USER_ROLES.BUYER]), sellerController.submitSellerRequest);
router.get('/requests', verifyToken([USER_ROLES.BUYER]), sellerController.getUserRequests);

// Routes for admins
router.get(
  '/all-requests',
  verifyToken([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  sellerController.getSellerRequests
);
router.patch(
  '/requests/:requestId',
  verifyToken([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  sellerController.processSellerRequest
);

module.exports = router;
