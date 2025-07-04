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

  /**
   * Paginate cart products by userId (new model: each document is one product)
   * @param {string} userId - User ID
   * @param {Object} query - Pagination query (page, limit, sortBy, sortOrder)
   * @returns {Promise<Object>} Paginated result
   */
  async paginateCartByUserId(userId, query) {
    // Use BaseService's paginate method, filter by user
    const filter = { user: userId };
    const result = await this.paginate(query, filter);
    // Populate product for each cart item
    if (result.data && result.data.length > 0) {
      // Populate product for each item (lean does not support .populate so we need to query again)
      const Cart = this.model;
      const ids = result.data.map(item => item._id);
      const populated = await Cart.find({ _id: { $in: ids } })
        .populate('product')
        .lean();
      // Keep the original pagination order
      const populatedMap = new Map(populated.map(item => [item._id.toString(), item]));
      result.data = result.data.map(item => populatedMap.get(item._id.toString()) || item);
    }
    return result;
  }

  /**
   * Remove products from cart by user and productIds
   * @param {ObjectId} user - User id
   * @param {Array<string>} productIds - Array of product ids to remove
   * @returns {Promise<Object>} Updated cart
   */
  async removeProductsFromCart(user, productIds) {
    const cart = await this.model.findOne({ user });
    if (!cart) {
      // If no cart, return empty cart
      return { products: [] };
    }
    cart.products = cart.products.filter(item => !productIds.includes(item.product.toString()));
    await cart.save();
    await cart.populate('products.product');
    return cart;
  }
}

module.exports = new CartService();
