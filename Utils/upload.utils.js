const multer = require('multer');
const { SUPPORTED_FILE_TYPES } = require('./constant');
const { AppError } = require('./error.utils');

/**
 * Configure multer for memory storage with multiple file support
 * @returns {multer.Multer} Configured multer instance
 */
const configureMulter = () => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per file
      files: 5, // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
      const isImage = SUPPORTED_FILE_TYPES.IMAGE.MIME_TYPES.includes(file.mimetype);
      const isVideo = SUPPORTED_FILE_TYPES.VIDEO.MIME_TYPES.includes(file.mimetype);

      if (isImage || isVideo) {
        return cb(null, true);
      }

      const supportedTypes = [
        ...SUPPORTED_FILE_TYPES.IMAGE.EXTENSIONS,
        ...SUPPORTED_FILE_TYPES.VIDEO.EXTENSIONS,
      ].join(', ');

      cb(
        new AppError(
          `File ${file.originalname} is not supported. Supported file types are: ${supportedTypes}`,
          400
        )
      );
    },
  });
};

module.exports = {
  configureMulter,
};
