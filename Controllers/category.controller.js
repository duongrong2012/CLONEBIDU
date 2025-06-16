const categoryService = require('../Services/category.service');
const { catchAsync } = require('../Utils/error.utils');
const response = require('../Utils/response.utils');

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

/**
 * Update a category by id
 * @route PUT /admin/categories/:id
 * @access Private (Admin only)
 */
const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updatedCategory = await categoryService.update(id, req.body, req.category);
  return res.json(response.success(updatedCategory));
});

module.exports = {
  createCategory,
  updateCategory,
};
