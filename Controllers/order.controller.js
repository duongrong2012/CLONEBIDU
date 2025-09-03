const response = require('../Utils/response.utils');
const { catchAsync } = require('../Utils/error.utils');
const orderService = require('../Services/order.service');

/**
 * Controller for order preview
 */
class OrderController {
  /**
   * Get order preview for current user
   */
  preview = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const voucherOrder = req.validatedData?.voucherOrder || null;
    const voucherShipping = req.validatedData?.voucherShipping || null;
    const items = req.validatedData?.items || [];
    const deliveryLocation = req.validatedData?.deliveryLocation || null;
    const deliveryMethod = req.validatedData?.deliveryMethod || null;
    const result = await orderService.preview(
      userId,
      voucherOrder,
      voucherShipping,
      items,
      deliveryLocation,
      deliveryMethod
    );
    res.json(response.success('Order preview generated successfully', result));
  });
}

module.exports = new OrderController();
