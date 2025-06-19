const uploadService = require('../Services/upload.service');
const { catchAsync } = require('../Utils/error.utils');
const response = require('../Utils/response.utils');

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

  /**
   * Update user avatar using uploaded media
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} _next - Express next function
   */
  updateUserAvatar = catchAsync(async (req, res, _next) => {
    const { mediaId } = req.body;
    const userId = req.user._id;

    const result = await uploadService.updateUserAvatar(mediaId, userId);

    return res.status(200).json({
      status: 'success',
      message: 'User avatar updated successfully',
      data: result,
    });
  });

  /**
   * Update category image using uploaded media
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} _next - Express next function
   */
  updateCategoryImage = catchAsync(async (req, res, _next) => {
    const { mediaId, categoryId } = req.validatedData;

    const result = await uploadService.updateCategoryImage(mediaId, categoryId);

    return res.status(200).json(response.success('Category image updated successfully', result));
  });

  /**
   * Upload product images (link media to product)
   * @route PATCH /api/upload/product/:productId/images
   * @access Private (Admin, Seller)
   */
  uploadProductImages = catchAsync(async (req, res) => {
    const { product, mediaIds, medias } = req.validatedData;
    const {
      product: updatedProduct,
      success,
      failed,
    } = await uploadService.uploadProductImages(product, mediaIds, medias);
    const message =
      failed.length > 0
        ? 'Product images updated (partial success)'
        : 'Product images updated successfully';
    return res
      .status(200)
      .json(response.success(message, { product: updatedProduct, success, failed }));
  });
}

module.exports = new UploadController();
