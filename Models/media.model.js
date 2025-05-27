const mongoose = require('mongoose');
const { IMAGE_OWNER_TYPE, MEDIA_TYPE } = require('../Utils/constant');

/**
 * Media Schema
 * @property {String} url - The public URL of the media file stored on BizflyCloud
 * @property {String} type - The type of the media (image, video, ...)
 * @property {String} ownerType - The type of the owner (User, Product, Category, ...)
 * @property {mongoose.Schema.Types.ObjectId} ownerId - The ID of the owner
 */
const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(MEDIA_TYPE),
      required: true,
    },
    ownerType: {
      type: String,
      enum: Object.values(IMAGE_OWNER_TYPE),
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Media', mediaSchema);
