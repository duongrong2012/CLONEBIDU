const express = require('express');
const router = express.Router();
const paymentController = require('../Controllers/payment.controller');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { validateInitiatePayment } = require('../Middlewares/payment-validation');
const { verifySepayWebhookAuth } = require('../Middlewares/sepay-webhook-auth');

router.post(
  '/orders/:orderId/initiate',
  verifyToken(),
  validateInitiatePayment,
  paymentController.initiatePayment
);
router.post('/sepay/webhook', verifySepayWebhookAuth, paymentController.handleSepayWebhook);
router.get('/orders/:orderId/status', verifyToken(), paymentController.getPaymentStatus);

module.exports = router;
