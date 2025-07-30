const Voucher = require('../Models/voucher.model');

/**
 * Service class for voucher business logic
 */
class VoucherService {
  /**
   * Create a new voucher (Admin only)
   * @param {Object} data - Validated voucher data
   * @param {ObjectId} userId - User ID who created the voucher
   * @returns {Promise<Object>} Created voucher
   */
  async createVoucherAdmin(data, userId) {
    const voucherData = {
      ...data,
      createdBy: userId,
    };
    const voucher = await Voucher.create(voucherData);
    return voucher;
  }

  /**
   * Create a new voucher (Seller only)
   * @param {Object} data - Validated voucher data
   * @param {ObjectId} sellerId - Seller ID who created the voucher
   * @returns {Promise<Object>} Created voucher
   */
  async createVoucherSeller(data, sellerId) {
    const voucherData = {
      ...data,
      createdBy: sellerId,
    };
    const voucher = await Voucher.create(voucherData);
    return voucher;
  }
}

module.exports = new VoucherService();
