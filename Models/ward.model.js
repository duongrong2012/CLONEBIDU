const mongoose = require('mongoose');

/**
 * Ward Schema
 * @typedef {object} Ward
 * @property {string} code - Ward code (unique, required)
 * @property {string} name - Ward name (required)
 * @property {string} slug - Ward slug (required)
 * @property {string} type - Ward type (required)
 * @property {string} name_with_type - Full name with type (required)
 * @property {string} path - Path (required)
 * @property {string} path_with_type - Path with type (required)
 * @property {string} parent_code - Parent code (required)
 */
const wardSchema = new mongoose.Schema(
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
    path: {
      type: String,
      required: true,
      trim: true,
    },
    path_with_type: {
      type: String,
      required: true,
      trim: true,
    },
    parent_code: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'wards',
  }
);

wardSchema.plugin(require('mongoose-paginate-v2'));

module.exports = mongoose.model('Ward', wardSchema);
