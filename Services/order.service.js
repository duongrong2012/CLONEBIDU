// No longer reading from cart; prices come from items provided by FE
const { VOUCHER_TYPE } = require('../Utils/constant');
const { calculateShippingFee } = require('../Utils/shipping.utils');

/**
 * Service for building an order preview from the current cart
 */
class OrderService {
  /**
   * Build order preview for a user with an optional voucher
   * @param {string} userId - Current user id
   * @param {Object|null} voucherOrder - Order discount voucher doc
   * @param {Object|null} voucherShipping - Shipping discount voucher doc
   * @returns {Promise<{ items: Array, summary: { subtotal: number, discount: number, shippingDiscount: number, total: number }, voucher: { order: any, shipping: any } }>} Preview
   */
  async preview(
    userId,
    voucherOrder,
    voucherShipping,
    itemsFromRequest,
    deliveryLocation,
    deliveryMethod
  ) {
    // Items are validated and enriched in middleware; trust and reuse here
    const items = Array.isArray(itemsFromRequest) ? itemsFromRequest : [];
    const subtotal = items.reduce((sum, it) => sum + it.itemTotal, 0);

    // Compute discount for order voucher
    let discount = 0;
    if (voucherOrder) {
      // Determine eligible items by scope; if scope arrays are all empty, apply to all
      const hasScope = arr => Array.isArray(arr) && arr.length > 0;
      const scopedByProducts = hasScope(voucherOrder.applicableProducts);
      const scopedByCategories = hasScope(voucherOrder.applicableCategories);
      const scopedBySellers = hasScope(voucherOrder.applicableSellers);

      const isItemEligible = item => {
        if (!scopedByProducts && !scopedByCategories && !scopedBySellers) return true;
        if (
          scopedByProducts &&
          voucherOrder.applicableProducts.some(id => String(id) === item.productId)
        )
          return true;
        if (
          scopedByCategories &&
          item.categories.some(cid =>
            voucherOrder.applicableCategories.some(id => String(id) === cid)
          )
        )
          return true;
        if (
          scopedBySellers &&
          voucherOrder.applicableSellers.some(id => String(id) === item.sellerId)
        )
          return true;
        return false;
      };

      const eligibleSubtotal = items
        .filter(isItemEligible)
        .reduce((sum, item) => sum + item.itemTotal, 0);

      if (voucherOrder.type === VOUCHER_TYPE.FIXED) {
        discount = Math.max(0, Math.min(voucherOrder.discountValue, eligibleSubtotal));
      } else if (voucherOrder.type === VOUCHER_TYPE.PERCENTAGE) {
        const raw = (eligibleSubtotal * voucherOrder.discountValue) / 100;
        discount = raw;
        if (typeof voucherOrder.maxDiscount === 'number' && voucherOrder.maxDiscount > 0) {
          discount = Math.min(discount, voucherOrder.maxDiscount);
        }
      }
    }

    // Shipping fee calculation (stub)
    const shippingFee = calculateShippingFee(deliveryLocation, deliveryMethod);

    // Compute shipping discount against shipping fee (not subtotal)
    let shippingDiscount = 0;
    if (voucherShipping) {
      if (voucherShipping.type === VOUCHER_TYPE.FIXED) {
        shippingDiscount = Math.max(0, Math.min(voucherShipping.discountValue, shippingFee));
      } else if (voucherShipping.type === VOUCHER_TYPE.PERCENTAGE) {
        const raw = (shippingFee * voucherShipping.discountValue) / 100;
        shippingDiscount = raw;
        if (typeof voucherShipping.maxDiscount === 'number' && voucherShipping.maxDiscount > 0) {
          shippingDiscount = Math.min(shippingDiscount, voucherShipping.maxDiscount);
        }
      }
    }

    const total = Math.max(0, subtotal - discount + Math.max(0, shippingFee - shippingDiscount));

    return {
      items,
      summary: {
        subtotal,
        discount,
        shippingFee,
        shippingDiscount,
        total,
      },
      voucher: {
        order: voucherOrder
          ? {
              code: voucherOrder.code,
              type: voucherOrder.type,
              discountValue: voucherOrder.discountValue,
              maxDiscount: voucherOrder.maxDiscount,
              minOrderValue: voucherOrder.minOrderValue,
            }
          : null,
        shipping: voucherShipping
          ? {
              code: voucherShipping.code,
              type: voucherShipping.type,
              discountValue: voucherShipping.discountValue,
              maxDiscount: voucherShipping.maxDiscount,
              minOrderValue: voucherShipping.minOrderValue,
            }
          : null,
      },
    };
  }
}

module.exports = new OrderService();
