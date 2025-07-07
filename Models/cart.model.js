/**
 * Cart model schema
 * @property {ObjectId} user - Reference to the User who owns the cart
 * @property {ObjectId} product - Reference to the Product
 * @property {Number} quantity - Quantity of the product in the cart
 * @property {Date} createdAt - Cart creation timestamp
 * @property {Date} updatedAt - Cart update timestamp
 */

const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const cartSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique user-product combination
cartSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
