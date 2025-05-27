const uploadService = require('../Services/upload.service');
const { catchAsync } = require('../Utils/error.utils');

/**
 * Controller for handling file uploads
 */
class UploadController {
  /**
   * Upload multiple files to BizflyCloud Simple Storage
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} _next - Express next function
   */
  uploadFile = catchAsync(async (req, res, _next) => {
    const results = await Promise.allSettled(
      req.files.map(file => uploadService.uploadFile(file, file.folder))
    );

    const success = results.filter(r => r.status === 'fulfilled').map(r => r.value);

    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);

    return res.status(200).json({
      status: 'success',
      message: 'Upload completed',
      data: success,
      failed: failed.length ? failed : undefined,
    });
  });
}

module.exports = new UploadController();
