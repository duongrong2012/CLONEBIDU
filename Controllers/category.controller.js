const categoryService = require('../Services/category.service');
const { catchAsync } = require('../Utils/error.utils');

/**
 * Create a new category
 * @route POST /admin/categories
 * @access Private (Admin only)
 */
const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.create(req.body);
  res.status(201).json({
    status: 'success',
    data: category,
  });
});

module.exports = {
  createCategory,
};
