const BaseService = require('./base.service');
const Cart = require('../Models/cart.model');

/**
 * Service class for handling cart operations
 */
class CartService extends BaseService {
  constructor() {
    super(Cart);
  }

  /**
   * Add product to cart for a user
   * @param {ObjectId} user - User id
   * @param {ObjectId} product - Product id
   * @param {Number} quantity - Quantity of the product
   * @returns {Promise<Object>} Created or updated cart item
   */
  async addToCart(user, product, quantity) {
    // Try to find existing cart item for this user and product
    let cartItem = await Cart.findOne({ user, product });

    if (cartItem) {
      // Update quantity if item already exists
      cartItem.quantity = quantity;
      await cartItem.save();
    } else {
      // Create new cart item if it doesn't exist
      cartItem = new Cart({ user, product, quantity });
      await cartItem.save();
    }

    // Populate product details
    await cartItem.populate('product');
    return cartItem;
  }
}

module.exports = new CartService();
