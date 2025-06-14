const BaseService = require('./base.service');
const Category = require('../Models/category.model');

class CategoryService extends BaseService {
  constructor() {
    super(Category);
  }

  /**
   * Create a new category
   * @param {Object} data - Category data
   * @returns {Promise<Object>} Created category
   */
  async create(data) {
    const { parentId } = data;

    // Set level based on parent
    if (parentId) {
      const parent = await this.model.findById(parentId);
      data.level = parent.level + 1;
    }

    const category = await this.model.create(data);

    //if parentId is not null, update the parent category to add the new category to its children array and set hasChildren to true
    if (parentId) {
      await this.model.findByIdAndUpdate(parentId, {
        $addToSet: { children: category._id },
        hasChildren: true,
      });
    }

    return category;
  }
}

module.exports = new CategoryService();
