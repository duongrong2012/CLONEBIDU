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

  /**
   * Update old parent when removing a child
   * @param {String} parentId - Old parent id
   * @param {String} childId - Child id to remove
   */
  async _updateOldParent(parentId, childId) {
    await this.model.findByIdAndUpdate(parentId, {
      $pull: { children: childId },
      $set: { hasChildren: await this._hasOtherChildren(parentId, childId) },
    });
  }

  /**
   * Update a category
   * @param {String} id - Category id
   * @param {Object} data - Update data (filtered)
   * @param {Object} oldCategory - Old category document (from middleware)
   * @returns {Promise<Object>} Updated category
   */
  async update(id, data, oldCategory) {
    // If parentId is changed, update parent/child relations
    if (data.parentId && String(data.parentId) !== String(oldCategory.parentId)) {
      // Remove from old parent
      if (oldCategory.parentId) {
        await this._updateOldParent(oldCategory.parentId, id);
      }
      // Add to new parent
      await this.model.findByIdAndUpdate(data.parentId, {
        $addToSet: { children: id },
        hasChildren: true,
      });
      // Update level based on new parent
      const newParent = await this.model.findById(data.parentId);
      data.level = newParent.level + 1;
    }
    // If parentId is removed (become root)
    if (data.parentId === null) {
      data.level = 0;
      // Update old parent if exists
      if (oldCategory.parentId) {
        await this._updateOldParent(oldCategory.parentId, id);
      }
    }
    // Update category
    const updatedCategory = await this.model.findByIdAndUpdate(id, data, { new: true });
    return updatedCategory;
  }

  /**
   * Check if parent has other children after removing one
   * @param {String} parentId
   * @param {String} exceptId
   * @returns {Promise<Boolean>}
   */
  async _hasOtherChildren(parentId, exceptId) {
    const parent = await this.model.findById(parentId);
    if (!parent) return false;
    return parent.children.filter(cid => String(cid) !== String(exceptId)).length > 0;
  }
}

module.exports = new CategoryService();
