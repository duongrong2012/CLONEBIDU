const ProvinceService = require('../Services/province.service');
const response = require('../Utils/response.utils');
const { catchAsync } = require('../Utils/error.utils');

/**
 * ProvinceController handles province API requests.
 * Only receives validated data from middleware, calls service, and returns response.
 */
class ProvinceController {
  /**
   * Get list of provinces (with optional pagination)
   * @route GET /provinces
   * @access Public
   */
  getProvinces = catchAsync(async (req, res) => {
    const { page, limit } = req.validatedData;
    const serviceResult = await ProvinceService.getProvinces({ page, limit });
    return res.json(
      response.success('Get provinces successfully', response.groupPagination(serviceResult))
    );
  });
}

module.exports = new ProvinceController();
