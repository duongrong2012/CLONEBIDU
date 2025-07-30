const voucherService = require('../Services/voucher.service');
const response = require('../Utils/response.utils');
const catchAsync = require('../Utils/error.utils').catchAsync;

/**
 * Controller class for voucher APIs
 */
class VoucherController {
  /**
   * Create a new voucher (Admin only)
   * @route POST /admin/vouchers
   * @access Admin, Super Admin
   */
  createVoucherAdmin = catchAsync(async (req, res) => {
    const voucher = await voucherService.createVoucherAdmin(req.validatedData, req.user._id);
    res.json(response.success('Voucher created successfully', voucher));
  });

  /**
   * Create a new voucher (Seller only)
   * @route POST /buyer/vouchers
   * @access Seller
   */
  createVoucherSeller = catchAsync(async (req, res) => {
    const sellerId = req.user._id;

    // Seller vouchers only apply to their own shop
    const data = {
      ...req.validatedData,
      applicableSellers: [sellerId], // Only include the seller's own ID
    };

    const voucher = await voucherService.createVoucherSeller(data, sellerId);
    res.json(response.success('Voucher created successfully', voucher));
  });
}

module.exports = new VoucherController();
