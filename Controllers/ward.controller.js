const WardService = require('../Services/ward.service');
const response = require('../Utils/response.utils');
const { catchAsync } = require('../Utils/error.utils');

/**
 * WardController handles ward API requests.
 * Only receives validated data from middleware, calls service, and returns response.
 */
class WardController {
  /**
   * Get list of wards (with optional pagination)
   * @route GET /wards
   * @access Public
   */
  getWards = catchAsync(async (req, res) => {
    const { page, limit, parentCode } = req.validatedData;
    const serviceResult = await WardService.getWards({ page, limit, parentCode });
    return res.json(
      response.success('Get wards successfully', response.groupPagination(serviceResult))
    );
  });
}

module.exports = new WardController();
