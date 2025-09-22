const mongoose = require('mongoose');

/**
 * OrderDetail Schema
 * Stores a snapshot of product info when an order is placed
 */
const OrderDetailSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // Final per-unit price after applying variant price delta and discount snapshot
    finalUnitPrice: {
      type: Number,
      required: true,
    },
    // Snapshot price at order time
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
    },
    itemTotal: {
      type: Number,
      required: true,
    },
    // Snapshot fields
    name: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    // Variant snapshot
    variantCombinationId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    variantOptions: [
      {
        groupName: { type: String },
        optionValue: { type: String },
      },
    ],
    variantImage: {
      type: String,
      trim: true,
    },
    variantSku: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OrderDetail', OrderDetailSchema);
