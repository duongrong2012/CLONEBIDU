const { param, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');
const { AppError } = require('../Utils/error.utils');
const OrderModel = require('../Models/order.model');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../Utils/constant');

const validateInitiatePayment = [
  param('orderId')
    .exists()
    .withMessage('orderId is required')
    .bail()
    .isString()
    .withMessage('orderId must be a string')
    .bail()
    .custom(value => {
      if (!ObjectId.isValid(value)) {
        throw new Error('orderId must be a valid MongoId');
      }
      return true;
    })
    .bail()
    .custom(async (value, { req }) => {
      const order = await OrderModel.findById(value)
        .select('user status paymentStatus paymentProvider paymentMethod totalPrice createdAt')
        .lean();

      if (!order || String(order.user) !== String(req.user._id)) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus === PAYMENT_STATUS.PAID) {
        throw new Error('Order already paid');
      }

      if (order.status === ORDER_STATUS.CANCELLED) {
        throw new Error('Cannot pay for a cancelled order');
      }

      if (!order.paymentProvider) {
        throw new Error('Order does not have a payment provider configured');
      }

      if (order.paymentMethod !== PAYMENT_METHOD.ONLINE) {
        throw new Error('Order payment method must be ONLINE');
      }

      req.validatedData = {
        order,
      };

      return true;
    }),
  (req, _res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formatted = errors.array().map(err => ({ field: err.path, message: err.msg }));
      return next(new AppError('Validation failed', 400, formatted));
    }
    req.validatedData = {
      ...(req.validatedData || {}),
    };
    next();
  },
];

module.exports = {
  validateInitiatePayment,
};
