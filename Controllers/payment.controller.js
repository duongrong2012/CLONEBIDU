const response = require('../Utils/response.utils');
const { catchAsync } = require('../Utils/error.utils');
const paymentService = require('../Services/payment.service');
const { USER_ROLES } = require('../Utils/constant');

class PaymentController {
  initiatePayment = catchAsync(async (req, res) => {
    const { order } = req.validatedData;
    const userId = req.user._id;

    const result = await paymentService.initiatePayment({ userId, order });

    res.json(response.success('Payment initiated successfully', result));
  });

  handleSepayWebhook = async (req, res) => {
    try {
      if (req.webhookAuthPassed === false) {
        return res.json({ success: true });
      }
      await paymentService.handleSepayWebhook({ body: req.body, headers: req.headers });
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Error handling Sepay webhook:', error);
      // Always ACK 200 to prevent provider retries
    }
    res.json({ success: true });
  };

  getPaymentStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;
    const isAdmin = role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;
    const result = await paymentService.getPaymentStatus({ orderId, userId, isAdmin });
    res.json(response.success('Order payment status retrieved successfully', result));
  });
}

module.exports = new PaymentController();
