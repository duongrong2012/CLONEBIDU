const cartService = require('../Services/cart.service');
const response = require('../Utils/response.utils');
const { catchAsync } = require('../Utils/error.utils');

/**
 * Controller class for handling cart operations
 */
class CartController {
  /**
   * Add product to cart for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} _next - Express next middleware function
   */
  addCart = catchAsync(async (req, res, _next) => {
    const user = req.user;
    const { product, quantity } = req.validatedData;
    const cartItem = await cartService.addToCart(user, product, quantity);
    res.status(200).json(response.success('Product added to cart successfully', cartItem));
  });

  /**
   * Get paginated cart products for current user
   * @route GET /buyer/cart
   * @access Private (buyer)
   */
  getCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const query = req.validatedQuery;
    const result = await cartService.paginateCartByUserId(userId, query);
    const grouped = response.groupPagination(result);
    res.status(200).json(response.success('Get cart successfully', grouped));
  });

  /**
   * Remove products from cart for current user
   * @route DELETE /buyer/cart
   * @access Private (buyer)
   */
  removeFromCart = catchAsync(async (req, res) => {
    const user = req.user;
    const { productIds } = req.validatedData;
    const remainingCart = await cartService.removeProductsFromCart(user, productIds);
    res
      .status(200)
      .json(
        response.success('Removed products from cart successfully', { products: remainingCart })
      );
  });
}

module.exports = new CartController();
