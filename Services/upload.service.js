const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { AppError } = require('../Utils/error.utils');
const { MEDIA_TYPE, SUPPORTED_FILE_TYPES, IMAGE_OWNER_TYPE } = require('../Utils/constant');
const Media = require('../Models/media.model');
const User = require('../Models/user.model');
const Category = require('../Models/category.model');
const BaseService = require('./base.service');
const mongoose = require('mongoose');

class UploadService extends BaseService {
  constructor() {
    super(Media);
    this.s3 = new S3Client({
      region: process.env.BIZFLY_REGION,
      endpoint: process.env.BIZFLY_ENDPOINT,
      credentials: {
        accessKeyId: process.env.BIZFLY_ACCESS_KEY_ID,
        secretAccessKey: process.env.BIZFLY_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Required for BizflyCloud
    });
    this.bucket = process.env.BIZFLY_BUCKET_NAME;
  }

  /**
   * Upload file to BizflyCloud Simple Storage (S3-compatible)
   * @param {Object} file - File object from multer
   * @returns {Promise<Object>} Upload result with file URL and media type
   */
  async uploadFile(file) {
    // Determine folder based on file type
    const isImage = SUPPORTED_FILE_TYPES.IMAGE.MIME_TYPES.includes(file.mimetype);
    const folder = isImage ? MEDIA_TYPE.IMAGE : MEDIA_TYPE.VIDEO;
    const key = `${folder}/${Date.now()}-${file.originalname}`;
    const fileUrl = `${process.env.BIZFLY_PUBLIC_URL}/${key}`;
    try {
      // Upload file to BizflyCloud
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        })
      );
      // Save media info to database
      const media = await Media.create({
        url: fileUrl,
        type: folder,
        // ownerType and ownerId will be updated later
      });
      return {
        url: fileUrl,
        mediaType: folder,
        mediaId: media._id,
      };
    } catch (error) {
      // If DB save failed after upload, delete file from BizflyCloud
      if (error.name === 'MongoError' || error.name === 'MongooseError') {
        try {
          await this.s3.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: key,
            })
          );
        } catch (deleteErr) {
          // Use AppError for logging error according to coding rules
          throw new AppError(
            'Failed to delete file from BizflyCloud after DB error: ' + deleteErr.message,
            500
          );
        }
      }
      throw new AppError(`Failed to upload file: ${error.message}`, 400);
    }
  }

  /**
   * Update user avatar using uploaded media
   * @param {string} mediaId - ID of the uploaded media
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Updated user object
   */
  async updateUserAvatar(mediaId, userId) {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw new AppError('Invalid mediaId format', 400);
    }
    // Find media by ID
    const media = await this.getById(mediaId);
    if (!media) {
      throw new AppError('Media not found', 404);
    }

    // Update media with owner info
    await this.update(mediaId, {
      ownerType: IMAGE_OWNER_TYPE.USER,
      ownerId: userId,
    });

    // Update user avatar
    const updatedUser = await User.findByIdAndUpdate(userId, { avatar: media.url }, { new: true });

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    return updatedUser.toPublicJSON();
  }

  /**
   * Update category image using uploaded media
   * @param {string} mediaId - ID of the uploaded media
   * @param {string} categoryId - ID of the category
   * @returns {Promise<Object>} Updated category object
   */
  async updateCategoryImage(mediaId, categoryId) {
    // Update media with owner info
    const updatedMedia = await this.update(mediaId, {
      ownerType: IMAGE_OWNER_TYPE.CATEGORY,
      ownerId: categoryId,
    });

    if (!updatedMedia) {
      return null;
    }

    // Update category image
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { image: updatedMedia.url },
      { new: true }
    );
    return updatedCategory;
  }
}

module.exports = new UploadService();
