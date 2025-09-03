/**
 * Calculate shipping fee based on delivery location and delivery method.
 * This is a stub implementation and returns a fixed number for now.
 * @param {{ lat:number, lng:number }|any} deliveryLocation - Delivery coordinates or address object
 * @param {string} deliveryMethod - Delivery method enum (e.g., STANDARD, EXPRESS)
 * @returns {number} Shipping fee in VND
 */
function calculateShippingFee(deliveryLocation, deliveryMethod) {
  // Future: compute by distance, weight, and method. For now, return a fixed fee.
  void deliveryLocation; // suppress unused for current stub
  void deliveryMethod; // suppress unused for current stub
  return 30000; // 30,000 VND flat fee as placeholder
}

module.exports = {
  calculateShippingFee,
};
