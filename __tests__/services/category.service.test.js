/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const categoryService = require('../../Services/category.service');
const Category = require('../../Models/category.model');
const { setupInMemoryMongo } = require('../index');

setupInMemoryMongo();

describe('CategoryService', () => {
  test('create sets level and updates parent children', async () => {
    const parent = await Category.create({
      name: 'Parent',
      slug: 'parent',
      level: 0,
      isActive: true,
    });
    const child = await categoryService.create({
      name: 'Child',
      slug: 'child',
      parentId: parent._id,
      isActive: true,
    });
    const updatedParent = await Category.findById(parent._id);
    expect(child.level).toBe(1);
    expect(updatedParent.hasChildren).toBe(true);
    expect(updatedParent.children.map(String)).toContain(String(child._id));
  });

  test('update moves category to new parent and updates level', async () => {
    const oldParent = await Category.create({ name: 'Old', slug: 'old', level: 0 });
    const newParent = await Category.create({ name: 'New', slug: 'new', level: 0 });
    const child = await Category.create({
      name: 'Child',
      slug: 'child',
      level: 1,
      parentId: oldParent._id,
    });

    await categoryService.update(String(child._id), { parentId: newParent._id }, child);

    const updatedChild = await Category.findById(child._id);
    const updatedOld = await Category.findById(oldParent._id);
    const updatedNew = await Category.findById(newParent._id);
    expect(updatedChild.level).toBe(1);
    expect(updatedOld.children.map(String)).not.toContain(String(child._id));
    expect(updatedNew.children.map(String)).toContain(String(child._id));
  });

  test('update removes parent and resets level', async () => {
    const parent = await Category.create({ name: 'Parent', slug: 'parent', level: 0 });
    const child = await Category.create({
      name: 'Child',
      slug: 'child',
      level: 1,
      parentId: parent._id,
    });

    await categoryService.update(String(child._id), { parentId: null }, child);
    const updatedChild = await Category.findById(child._id);
    const updatedParent = await Category.findById(parent._id);
    expect(updatedChild.level).toBe(0);
    expect(updatedParent.hasChildren).toBe(false);
  });

  test('hasOtherChildren returns false when no other children', async () => {
    const parent = await Category.create({ name: 'Parent', slug: 'parent', level: 0 });
    const child = await Category.create({
      name: 'Child',
      slug: 'child',
      level: 1,
      parentId: parent._id,
    });
    const result = await categoryService._hasOtherChildren(parent._id, child._id);
    expect(result).toBe(false);
  });

  test('getCategories supports search filter', async () => {
    await Category.create({ name: 'Electronics', slug: 'electronics', level: 0, isActive: true });
    const res = await categoryService.getCategories({ search: 'Elect' });
    expect(res.data.length).toBeGreaterThan(0);
  });
});
