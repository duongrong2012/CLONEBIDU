const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { AppError } = require('../Utils/error.utils');
const { MEDIA_TYPE, SUPPORTED_FILE_TYPES } = require('../Utils/constant');
const Media = require('../Models/media.model');

class UploadService {
  constructor() {
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
}

module.exports = new UploadService();
