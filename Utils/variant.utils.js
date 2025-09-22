/**
 * Variant utilities
 * Centralizes validation and resolution logic for product variants
 */
const { SUPPORTED_FILE_TYPES } = require('./constant');

/**
 * Check if product has variants
 * @param {any} product
 */
function hasVariants(product) {
  return Array.isArray(product?.variantGroups) && product.variantGroups.length > 0;
}

/**
 * Validate variant groups and combinations against product quantity.
 * - Each combination must include exactly one option per group
 * - Option values must exist in respective group
 * - Sum of combination quantities must equal product quantity
 * @param {{variantGroups?: any[], variantCombinations?: any[], productQuantity?: number}} input
 * @returns {{ valid: boolean, errors: string[], sumQuantity: number }}
 */
function validateVariantModelInput(input) {
  const groups = Array.isArray(input.variantGroups) ? input.variantGroups : [];
  const combos = Array.isArray(input.variantCombinations) ? input.variantCombinations : [];
  const errors = [];

  if (groups.length === 0 && combos.length === 0) {
    return { valid: true, errors, sumQuantity: 0 };
  }
  if (groups.length === 0 && combos.length > 0) {
    errors.push('variantCombinations requires variantGroups to be defined');
    return { valid: false, errors, sumQuantity: 0 };
  }
  if (groups.length > 0 && combos.length === 0) {
    errors.push('variantGroups requires variantCombinations to be defined');
    return { valid: false, errors, sumQuantity: 0 };
  }

  // Validate groups uniqueness and options uniqueness per group
  const groupNames = new Set();
  for (const g of groups) {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) {
      errors.push('Each variant group must have a non-empty name');
      continue;
    }
    if (groupNames.has(g.name)) errors.push(`Duplicate variant group: ${g.name}`);
    groupNames.add(g.name);
    const seenOpts = new Set();
    const opts = Array.isArray(g.options) ? g.options : [];
    for (const o of opts) {
      if (!o || typeof o.value !== 'string' || !o.value.trim()) {
        errors.push(`Group ${g.name}: option value must be non-empty string`);
        continue;
      }
      if (seenOpts.has(o.value)) errors.push(`Group ${g.name}: duplicate option ${o.value}`);
      seenOpts.add(o.value);
    }
  }

  // Validate combinations
  for (const c of combos) {
    const opts = Array.isArray(c.options) ? c.options : [];
    if (opts.length !== groups.length) {
      errors.push('Each variant combination must include exactly one option per variant group');
      continue;
    }
    // Require price and validate discountPrice
    if (typeof c.price !== 'number' || c.price < 0) {
      errors.push('Each variant combination must have a non-negative price');
    }
    if (c.discountPrice !== undefined && c.discountPrice !== null) {
      if (typeof c.discountPrice !== 'number' || c.discountPrice < 0) {
        errors.push(
          'variant combination discountPrice must be a non-negative number when provided'
        );
      } else if (typeof c.price === 'number' && c.discountPrice > c.price) {
        errors.push('variant combination discountPrice cannot be greater than price');
      }
    }
    for (const g of groups) {
      const matched = opts.find(o => o.groupName === g.name);
      if (!matched) {
        errors.push(`Combination missing option for group: ${g.name}`);
        continue;
      }
      const exists = Array.isArray(g.options)
        ? g.options.some(o => o.value === matched.optionValue)
        : false;
      if (!exists) errors.push(`Invalid option ${matched.optionValue} for group ${g.name}`);
    }
  }
  // Ensure unique options combination (avoid duplicate same options set)
  const optionsKeySet = new Set();
  for (const c of combos) {
    const key = (Array.isArray(c.options) ? c.options : [])
      .slice()
      .sort((a, b) => a.groupName.localeCompare(b.groupName))
      .map(o => `${o.groupName}=${o.optionValue}`)
      .join('|');
    if (optionsKeySet.has(key)) errors.push(`Duplicate variant combination options: ${key}`);
    optionsKeySet.add(key);
  }

  const sumQuantity = combos.reduce((s, c) => s + (Number(c.quantity) || 0), 0);
  if (input.productQuantity === undefined || input.productQuantity === null) {
    // We cannot fully validate equality without product quantity
    return { valid: errors.length === 0, errors, sumQuantity };
  }

  if (sumQuantity !== Number(input.productQuantity)) {
    errors.push('Sum of variant combination quantities must equal product quantity');
  }
  return { valid: errors.length === 0, errors, sumQuantity };
}

/**
 * Validate image URLs for variant combinations (optional field)
 * Rules:
 * - If provided: must be a non-empty string
 * - Must be a valid http/https URL
 * - Path must end with an allowed image extension (per SUPPORTED_FILE_TYPES)
 * @param {Array<any>} variantCombinations
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateVariantImages(variantCombinations) {
  const combos = Array.isArray(variantCombinations) ? variantCombinations : [];
  const errors = [];
  const allowedExts = Array.isArray(SUPPORTED_FILE_TYPES?.IMAGE?.EXTENSIONS)
    ? SUPPORTED_FILE_TYPES.IMAGE.EXTENSIONS.map(e => e.toLowerCase())
    : ['.jpg', '.jpeg', '.png', '.webp'];

  for (const c of combos) {
    const img = c?.image;
    if (img === undefined || img === null) continue; // optional
    if (typeof img !== 'string' || !img.trim()) {
      errors.push('variant combination image must be a non-empty string when provided');
      continue;
    }
    const s = img.trim();
    let urlObj;
    try {
      urlObj = new URL(s);
    } catch {
      errors.push('variant combination image must be a valid URL');
      continue;
    }
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('variant combination image must use http or https');
    }
    const pathname = (urlObj.pathname || '').toLowerCase();
    if (!allowedExts.some(ext => pathname.endsWith(ext))) {
      errors.push(
        'variant combination image must have a valid image extension (.jpg, .jpeg, .png, .webp)'
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Normalize SKU to uppercase trimmed; return null if empty/invalid
 * @param {any} value
 * @returns {string|null}
 */
function normalizeSku(value) {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.toUpperCase();
}

/**
 * Extract normalized SKUs from variantCombinations
 * @param {Array<any>} variantCombinations
 * @returns {string[]} normalized non-empty SKUs
 */
function extractSkus(variantCombinations) {
  const combos = Array.isArray(variantCombinations) ? variantCombinations : [];
  return combos.map(c => normalizeSku(c?.sku)).filter(s => typeof s === 'string' && s.length > 0);
}

/**
 * Validate SKU uniqueness within a single product payload. Does NOT check DB.
 * @param {Array<any>} variantCombinations
 * @returns {{ valid: boolean, errors: string[], skus: string[] }}
 */
function validateSkuPayloadUniqueness(variantCombinations) {
  const errors = [];
  const skus = extractSkus(variantCombinations);
  const seen = new Set();
  for (const s of skus) {
    if (seen.has(s)) {
      errors.push(`Duplicate SKU within product: ${s}`);
    } else {
      seen.add(s);
    }
  }
  return { valid: errors.length === 0, errors, skus };
}

/**
 * Resolve variant selection for an order item.
 * @param {any} product - product document (lean)
 * @param {{ _id?: string, options?: Array<{groupName:string, optionValue:string}> }} variant
 * @returns {{ combination: any, optionsSnapshot: Array<{groupName:string, optionValue:string}> }}
 */
function resolveVariantSelection(product, variant) {
  if (!hasVariants(product)) {
    if (variant) throw new Error('Product has no variants');
    return { combination: null, optionsSnapshot: undefined };
  }
  if (!variant || typeof variant !== 'object') {
    throw new Error('Variant selection is required');
  }
  const combos = Array.isArray(product.variantCombinations) ? product.variantCombinations : [];
  let chosen = null;
  if (variant._id) {
    chosen = combos.find(c => String(c._id) === String(variant._id));
    if (!chosen) throw new Error('Invalid variant combination _id');
  } else if (Array.isArray(variant.options)) {
    const groups = Array.isArray(product.variantGroups) ? product.variantGroups : [];
    if (variant.options.length !== groups.length) {
      throw new Error('Variant options must include one value per group');
    }
    const normalized = groups.map(group => {
      const opt = variant.options.find(o => o.groupName === group.name);
      if (!opt) throw new Error(`Missing variant for group ${group.name}`);
      const exists = Array.isArray(group.options)
        ? group.options.some(g => g.value === opt.optionValue)
        : false;
      if (!exists) throw new Error(`Invalid option ${opt.optionValue} for group ${group.name}`);
      return { groupName: group.name, optionValue: opt.optionValue };
    });
    chosen = combos.find(c => {
      const opts = Array.isArray(c.options) ? c.options : [];
      if (opts.length !== normalized.length) return false;
      return normalized.every(n =>
        opts.some(o => o.groupName === n.groupName && o.optionValue === n.optionValue)
      );
    });
    if (!chosen) throw new Error('Variant option combination is not available');
  } else {
    throw new Error('Variant must include _id or options');
  }

  const optionsSnapshot = (Array.isArray(chosen.options) ? chosen.options : []).map(o => ({
    groupName: o.groupName,
    optionValue: o.optionValue,
  }));

  return { combination: chosen, optionsSnapshot };
}

/**
 * Calculate final unit price from product base price/discountPrice and combination price/discountPrice
 * @param {number} basePrice
 * @param {number|undefined} baseDiscountPrice
 * @param {{price:number,discountPrice?:number}|null} chosenCombination
 */
function calculateFinalUnitPrice(basePrice, baseDiscountPrice, chosenCombination) {
  // If combination exists and has its own price/discountPrice, use them; else fall back to product base price
  if (chosenCombination && typeof chosenCombination.price === 'number') {
    const comboBase = chosenCombination;
    const use =
      typeof comboBase.discountPrice === 'number' && comboBase.discountPrice >= 0
        ? comboBase.discountPrice
        : comboBase.price;
    return Math.max(0, use);
  }
  const use =
    typeof baseDiscountPrice === 'number' && baseDiscountPrice >= 0 ? baseDiscountPrice : basePrice;
  return Math.max(0, use);
}

/**
 * Check SKUs are unique per seller across products using provided Product model.
 * Note: Accepts ProductModel to avoid circular dependency when used from model hooks.
 * @param {any} ProductModel - Mongoose model for Product (e.g., require('../Models/product.model'))
 * @param {string|any} sellerId - createdBy of product (seller id)
 * @param {string[]} skus - normalized SKUs to check
 * @param {string|any} [excludeProductId] - product id to exclude when updating
 * @returns {Promise<{ ok: boolean, conflict: any|null }>} - ok=false when conflict found
 */
async function checkSkuUniquePerSellerWithModel(ProductModel, sellerId, skus, excludeProductId) {
  if (!Array.isArray(skus) || skus.length === 0) return { ok: true, conflict: null };
  if (!sellerId) return { ok: true, conflict: null };
  const filter = {
    createdBy: sellerId,
    'variantCombinations.sku': { $in: skus },
  };
  if (excludeProductId) filter._id = { $ne: excludeProductId };
  const conflict = await ProductModel.findOne(filter).lean();
  return { ok: !conflict, conflict };
}

module.exports = {
  hasVariants,
  validateVariantModelInput,
  validateVariantImages,
  resolveVariantSelection,
  calculateFinalUnitPrice,
  normalizeSku,
  extractSkus,
  validateSkuPayloadUniqueness,
  checkSkuUniquePerSellerWithModel,
};
