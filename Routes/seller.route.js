const express = require('express');
const router = express.Router();
const sellerController = require('../Controllers/seller.controller');
const { verifyToken, checkRole } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Route cho người dùng gửi yêu cầu trở thành người bán
router.post('/requests', verifyToken, sellerController.submitSellerRequest);

// Route cho admin xem danh sách yêu cầu
router.get('/requests', verifyToken, checkRole(USER_ROLES.ADMIN), sellerController.getSellerRequests);

// Route cho admin xử lý yêu cầu
router.patch('/requests/:requestId', verifyToken, checkRole(USER_ROLES.ADMIN), sellerController.processSellerRequest);

// Route cho người dùng xem yêu cầu của mình
router.get('/my-requests', verifyToken, sellerController.getUserRequests);

module.exports = router; 