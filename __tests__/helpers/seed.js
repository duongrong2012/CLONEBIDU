/* eslint-env jest */
const Category = require('../../Models/category.model');
const Product = require('../../Models/product.model');
const { PRODUCT_STATUS, USER_ROLES } = require('../../Utils/constant');
const { seedUser } = require('./auth');

async function seedCategory(name = 'Cat') {
  return Category.create({
    name,
    slug: `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    isActive: true,
  });
}

async function seedProduct(overrides = {}) {
  const seller = overrides.seller ?? (await seedUser({ role: USER_ROLES.SELLER }));
  return Product.create({
    name: overrides.name ?? 'P',
    description: overrides.description ?? 'd',
    price: overrides.price ?? 100000,
    discountPrice: overrides.discountPrice,
    status: overrides.status ?? PRODUCT_STATUS.APPROVED,
    isActive: overrides.isActive ?? true,
    quantity: overrides.quantity ?? 10,
    categories: overrides.categories ?? [],
    createdBy: seller._id,
    variantGroups: overrides.variantGroups ?? [],
    variantCombinations: overrides.variantCombinations ?? [],
  });
}

module.exports = {
  seedCategory,
  seedProduct,
};
