const mongoose = require('mongoose');

/**
 * Province Schema
 * @typedef {object} Province
 * @property {string} code - Province code (unique, required)
 * @property {string} name - Province name (required)
 * @property {string} slug - Province slug (required)
 * @property {string} type - Province type (required)
 * @property {string} name_with_type - Full name with type (required)
 */
const provinceSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    name_with_type: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'provinces',
  }
);

provinceSchema.plugin(require('mongoose-paginate-v2'));

module.exports = mongoose.model('Province', provinceSchema);
