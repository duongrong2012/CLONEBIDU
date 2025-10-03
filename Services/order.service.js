// No longer reading from cart; prices come from items provided by FE
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const {
  VOUCHER_TYPE,
  ORDER_STATUS,
  PRODUCT_STATUS,
  VOUCHER_STATUS,
  VOUCHER_TARGET,
} = require('../Utils/constant');
const { calculateShippingFee } = require('../Utils/shipping.utils');
const OrderModel = require('../Models/order.model');
const OrderDetailModel = require('../Models/order-detail.model');
const ProductModel = require('../Models/product.model');
const VoucherModel = require('../Models/voucher.model');

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

  /**
   * Create an order from validated preview data
   * Note: voucher per-user usage will be enforced at redeem stage.
   */
  async createOrder({
    userId,
    items,
    deliveryLocation,
    deliveryMethod,
    voucherOrder,
    voucherShipping,
    paymentMethod,
    models,
  }) {
    const Order = models?.Order || OrderModel;
    const OrderDetail = models?.OrderDetail || OrderDetailModel;
    const session = await mongoose.startSession();
    let orderDoc = null;
    const Product = models?.Product || ProductModel;
    const Voucher = models?.Voucher || VoucherModel;

    try {
      session.startTransaction();

      // Recalculate preview inside the transaction to ensure pricing consistency
      const preview = await this.preview(
        userId,
        voucherOrder,
        voucherShipping,
        items,
        deliveryLocation,
        deliveryMethod
      );

      const voucherCodes = [];
      const voucherClone = {};
      let voucherOrderDoc = null;
      let voucherShippingDoc = null;

      if (voucherOrder) {
        if (voucherOrder.target && voucherOrder.target !== VOUCHER_TARGET.ORDER_DISCOUNT) {
          throw new Error(`Voucher target mismatch for code: ${voucherOrder.code}`);
        }
        voucherCodes.push(voucherOrder.code);
        voucherClone.order = { code: voucherOrder.code };
        voucherOrderDoc = await Voucher.findOne({ code: voucherOrder.code })
          .session(session)
          .exec();
        if (!voucherOrderDoc) {
          throw new Error(`Voucher not found during order creation: ${voucherOrder.code}`);
        }
        if (voucherOrderDoc.target !== VOUCHER_TARGET.ORDER_DISCOUNT) {
          throw new Error(`Voucher target mismatch for code: ${voucherOrder.code}`);
        }
        if (!voucherOrderDoc.isActive || voucherOrderDoc.status !== VOUCHER_STATUS.APPROVED) {
          throw new Error(`Voucher became unavailable: ${voucherOrder.code}`);
        }
        if (
          typeof voucherOrderDoc.quantity === 'number' &&
          typeof voucherOrderDoc.currentUsage === 'number' &&
          voucherOrderDoc.currentUsage >= voucherOrderDoc.quantity
        ) {
          throw new Error(`Voucher usage limit reached: ${voucherOrder.code}`);
        }
        if (
          typeof voucherOrderDoc.usageLimitPerUser === 'number' &&
          voucherOrderDoc.usageLimitPerUser > 0
        ) {
          const usageCount = await Order.countDocuments(
            {
              user: userId,
              voucherCode: voucherOrderDoc.code,
              status: { $ne: ORDER_STATUS.CANCELLED },
            },
            { session }
          );
          if (usageCount >= voucherOrderDoc.usageLimitPerUser) {
            throw new Error(`Voucher usage limit per user reached: ${voucherOrder.code}`);
          }
        }
      }
      if (voucherShipping) {
        if (voucherShipping.target && voucherShipping.target !== VOUCHER_TARGET.SHIPPING_DISCOUNT) {
          throw new Error(`Voucher target mismatch for code: ${voucherShipping.code}`);
        }
        voucherCodes.push(voucherShipping.code);
        voucherClone.shipping = { code: voucherShipping.code };
        voucherShippingDoc = await Voucher.findOne({ code: voucherShipping.code })
          .session(session)
          .exec();
        if (!voucherShippingDoc) {
          throw new Error(`Voucher not found during order creation: ${voucherShipping.code}`);
        }
        if (voucherShippingDoc.target !== VOUCHER_TARGET.SHIPPING_DISCOUNT) {
          throw new Error(`Voucher target mismatch for code: ${voucherShipping.code}`);
        }
        if (!voucherShippingDoc.isActive || voucherShippingDoc.status !== VOUCHER_STATUS.APPROVED) {
          throw new Error(`Voucher became unavailable: ${voucherShipping.code}`);
        }
        if (
          typeof voucherShippingDoc.quantity === 'number' &&
          typeof voucherShippingDoc.currentUsage === 'number' &&
          voucherShippingDoc.currentUsage >= voucherShippingDoc.quantity
        ) {
          throw new Error(`Voucher usage limit reached: ${voucherShipping.code}`);
        }
        if (
          typeof voucherShippingDoc.usageLimitPerUser === 'number' &&
          voucherShippingDoc.usageLimitPerUser > 0
        ) {
          const usageCount = await Order.countDocuments(
            {
              user: userId,
              voucherCode: voucherShippingDoc.code,
              status: { $ne: ORDER_STATUS.CANCELLED },
            },
            { session }
          );
          if (usageCount >= voucherShippingDoc.usageLimitPerUser) {
            throw new Error(`Voucher usage limit per user reached: ${voucherShipping.code}`);
          }
        }
      }

      orderDoc = new Order({
        user: userId,
        status: ORDER_STATUS.PENDING,
        shippingAddress: deliveryLocation,
        paymentMethod,
        voucherCode: voucherCodes,
        discountAmount: preview.summary.discount,
        shippingFee: preview.summary.shippingFee,
        subtotal: preview.summary.subtotal,
        totalPrice: preview.summary.total,
        voucher: voucherClone,
      });
      await orderDoc.save({ session });

      // Update voucher usage inside transaction
      if (voucherOrderDoc) {
        voucherOrderDoc.currentUsage = (voucherOrderDoc.currentUsage || 0) + 1;
        await voucherOrderDoc.save({ session });
      }
      if (voucherShippingDoc) {
        voucherShippingDoc.currentUsage = (voucherShippingDoc.currentUsage || 0) + 1;
        await voucherShippingDoc.save({ session });
      }

      // Adjust inventory for each item (variant-aware)
      const bulkOrderDetailItems = [];

      for (const item of preview.items) {
        const quantity = item.quantity;
        const variantCombinationObjectId = item.variantCombinationId
          ? ObjectId.createFromHexString(String(item.variantCombinationId))
          : null;
        const productObjectId = ObjectId.createFromHexString(String(item.productId));

        const productDoc = await Product.findOne({ _id: productObjectId }).session(session);
        if (!productDoc) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        if (!productDoc.isActive) {
          throw new Error(`Product is inactive: ${item.productId}`);
        }
        if (productDoc.status !== PRODUCT_STATUS.APPROVED) {
          throw new Error(`Product is not approved: ${item.productId}`);
        }
        if (quantity > Number(productDoc.quantity || 0)) {
          throw new Error(`Insufficient product quantity for product: ${item.productId}`);
        }

        let combinationDoc = null;
        if (variantCombinationObjectId) {
          combinationDoc = productDoc.variantCombinations.find(comb =>
            comb._id.equals(variantCombinationObjectId)
          );
          if (!combinationDoc) {
            throw new Error(`Variant combination not found for product: ${item.productId}`);
          }
          if (quantity > Number(combinationDoc.quantity || 0)) {
            throw new Error(`Insufficient variant quantity for product: ${item.productId}`);
          }
        }

        // Prepare order detail doc
        bulkOrderDetailItems.push({
          order: orderDoc._id,
          product: productObjectId,
          sellerId: item.sellerId,
          quantity,
          price: item.price,
          discountPrice: typeof item.discountPrice === 'number' ? item.discountPrice : undefined,
          finalUnitPrice: item.finalUnitPrice ?? item.unitPrice,
          itemTotal: item.itemTotal,
          name: item.name,
          images: item.images,
          categories: item.categories,
          variantCombinationId: variantCombinationObjectId || undefined,
          variantOptions: item.variantOptions,
          variantImage:
            typeof item.variantImage === 'string' && item.variantImage.trim().length > 0
              ? item.variantImage
              : undefined,
          variantSku:
            typeof item.variantSku === 'string' && item.variantSku.trim().length > 0
              ? item.variantSku
              : undefined,
        });

        // Decrement stock (variant-aware)
        const pullQuantity = Math.max(0, quantity);
        if (pullQuantity === 0) continue;

        if (variantCombinationObjectId) {
          combinationDoc.quantity -= pullQuantity;
        }
        productDoc.quantity -= pullQuantity;
        await productDoc.save({ session });
      }

      // Create order detail documents
      const orderDetailDocs = await OrderDetail.insertMany(bulkOrderDetailItems, {
        session,
        ordered: true,
      });

      // Link order details to order
      orderDoc.orderDetails = orderDetailDocs.map(d => d._id);
      await orderDoc.save({ session });

      await session.commitTransaction();
      session.endSession();
      return orderDoc;
    } catch (err) {
      if (orderDoc && orderDoc.isNew) {
        // ensure unsaved doc is not partially persisted
        orderDoc = null;
      }
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw err;
    }
  }
}

module.exports = new OrderService();
