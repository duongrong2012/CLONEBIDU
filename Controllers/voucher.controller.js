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

  /**
   * Update a voucher (Admin only)
   * @route PATCH /admin/vouchers/:id
   * @access Admin, Super Admin
   */
  updateVoucherAdmin = catchAsync(async (req, res) => {
    const { voucherId, updateData } = req.validatedData;
    const voucher = await voucherService.updateVoucherAdmin(voucherId, updateData);
    res.json(response.success('Voucher updated successfully', voucher));
  });

  /**
   * Update a voucher (Seller only)
   * @route PATCH /buyer/vouchers/:id
   * @access Seller
   */
  updateVoucherSeller = catchAsync(async (req, res) => {
    const { voucherId, updateData } = req.validatedData;
    const voucher = await voucherService.updateVoucherSeller(voucherId, updateData);
    res.json(response.success('Voucher updated successfully', voucher));
  });

  /**
   * Get vouchers for admin (with filter, pagination)
   * @route GET /admin/vouchers
   * @access Admin, Super Admin
   */
  getVouchersAdmin = catchAsync(async (req, res) => {
    const result = await voucherService.getVouchersAdmin(req.query);
    res.json(response.success('Vouchers retrieved successfully', response.groupPagination(result)));
  });

  /**
   * Get vouchers for seller (only own vouchers)
   * @route GET /buyer/vouchers
   * @access Seller
   */
  getVouchersSeller = catchAsync(async (req, res) => {
    const result = await voucherService.getVouchersSeller(req.query, req.user._id);
    res.json(response.success('Vouchers retrieved successfully', response.groupPagination(result)));
  });
}

module.exports = new VoucherController();
