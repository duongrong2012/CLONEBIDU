const Voucher = require('../Models/voucher.model');
const validationUtils = require('../Utils/validation.utils');

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

  /**
   * Update a voucher (Admin only)
   * @param {ObjectId} voucherId - Voucher ID to update
   * @param {Object} updateData - Validated update data
   * @returns {Promise<Object>} Updated voucher
   */
  async updateVoucherAdmin(voucherId, updateData) {
    const voucher = await Voucher.findByIdAndUpdate(
      voucherId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    return voucher;
  }

  /**
   * Update a voucher (Seller only)
   * @param {ObjectId} voucherId - Voucher ID to update
   * @param {Object} updateData - Validated update data
   * @returns {Promise<Object>} Updated voucher
   */
  async updateVoucherSeller(voucherId, updateData) {
    const voucher = await Voucher.findByIdAndUpdate(
      voucherId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    return voucher;
  }

  /**
   * Get vouchers for admin with filter, pagination, sort
   * @param {Object} query - Query params (page, limit, code, status, type, startDate, endDate, sortBy, sortOrder)
   * @returns {Promise<Object>} Paginated vouchers
   */
  async getVouchersAdmin(query) {
    const {
      code,
      status,
      type,
      startDate,
      endDate,
      source,
      createdBy,
      isActive,
      isPublic,
      minOrderValue,
      maxDiscount,
      discountValue,
      quantity,
    } = query;
    const { page, limit, sortBy, sortOrder } = validationUtils.validatePagination(query);
    const filter = {};
    if (code) filter.code = { $regex: code, $options: 'i' };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (startDate) filter.startDate = { ...(filter.startDate || {}), $gte: new Date(startDate) };
    if (endDate) filter.endDate = { ...(filter.endDate || {}), $lte: new Date(endDate) };
    if (createdBy) filter.createdBy = createdBy;
    if (isActive !== undefined) filter.isActive = isActive;
    if (isPublic !== undefined) filter.isPublic = isPublic;
    if (minOrderValue !== undefined) filter.minOrderValue = { $gte: Number(minOrderValue) };
    if (maxDiscount !== undefined) filter.maxDiscount = Number(maxDiscount);
    if (discountValue !== undefined) filter.discountValue = Number(discountValue);
    if (quantity !== undefined) filter.quantity = Number(quantity);
    const options = {
      page,
      limit,
      sort: { [sortBy]: sortOrder },
      lean: true,
      customLabels: {
        docs: 'data',
        totalDocs: 'total',
        totalPages: 'totalPages',
        page: 'page',
        limit: 'limit',
      },
    };
    return Voucher.paginate(filter, options);
  }

  /**
   * Get vouchers for seller (only own vouchers)
   * @param {Object} query - Query params
   * @param {string} sellerId - Current seller id
   * @returns {Promise<Object>} Paginated vouchers
   */
  async getVouchersSeller(query, sellerId) {
    const { page, limit, sortBy, sortOrder } = validationUtils.validatePagination(query);

    const {
      code,
      status,
      type,
      source,
      isActive,
      isPublic,
      minOrderValue,
      maxDiscount,
      discountValue,
      quantity,
      startDate,
      endDate,
    } = query;

    // Build common filter for both branches
    const commonFilters = [];
    if (code) commonFilters.push({ code: { $regex: code, $options: 'i' } });
    if (status) commonFilters.push({ status });
    if (type) commonFilters.push({ type });
    if (isActive !== undefined) commonFilters.push({ isActive });
    if (isPublic !== undefined) commonFilters.push({ isPublic });
    if (minOrderValue !== undefined)
      commonFilters.push({ minOrderValue: { $gte: Number(minOrderValue) } });
    if (maxDiscount !== undefined) commonFilters.push({ maxDiscount: Number(maxDiscount) });
    if (discountValue !== undefined) commonFilters.push({ discountValue: Number(discountValue) });
    if (quantity !== undefined) commonFilters.push({ quantity: Number(quantity) });
    if (startDate) commonFilters.push({ startDate: { $gte: new Date(startDate) } });
    if (endDate) commonFilters.push({ endDate: { $lte: new Date(endDate) } });

    // Branch A: seller-owned vouchers (SHOP)
    const branchShop = {
      source: 'SHOP',
      createdBy: sellerId,
      ...(commonFilters.length ? { $and: commonFilters } : {}),
    };

    // Branch B: system vouchers applicable to this seller (SYSTEM with applicableSellers contains sellerId)
    const branchSystem = {
      source: 'SYSTEM',
      applicableSellers: { $in: [sellerId] },
      ...(commonFilters.length ? { $and: commonFilters } : {}),
    };

    // If client filters source, restrict branches accordingly
    let orBranches = [];
    if (source === 'SHOP') orBranches = [branchShop];
    else if (source === 'SYSTEM') orBranches = [branchSystem];
    else orBranches = [branchShop, branchSystem];

    const filter = { $or: orBranches };

    const options = {
      page,
      limit,
      sort: { [sortBy]: sortOrder },
      lean: true,
      customLabels: {
        docs: 'data',
        totalDocs: 'total',
        totalPages: 'totalPages',
        page: 'page',
        limit: 'limit',
      },
    };

    return Voucher.paginate(filter, options);
  }
}

module.exports = new VoucherService();
