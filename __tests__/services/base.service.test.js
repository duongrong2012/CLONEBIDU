/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const BaseService = require('../../Services/base.service');
const { AppError } = require('../../Utils/error.utils');

describe('BaseService', () => {
  test('create returns created record', async () => {
    const model = { create: jest.fn().mockResolvedValue({ id: 1 }) };
    const service = new BaseService(model);
    const result = await service.create({ name: 'x' });
    expect(result).toEqual({ id: 1 });
  });

  test('create throws AppError on duplicate', async () => {
    const model = { create: jest.fn().mockRejectedValue({ code: 11000 }) };
    const service = new BaseService(model);
    await expect(service.create({ name: 'x' })).rejects.toBeInstanceOf(AppError);
  });

  test('getAll returns records', async () => {
    const model = { find: jest.fn().mockResolvedValue([{ id: 1 }]) };
    const service = new BaseService(model);
    const result = await service.getAll();
    expect(result).toHaveLength(1);
  });

  test('getById throws when not found', async () => {
    const model = { findById: jest.fn().mockResolvedValue(null) };
    const service = new BaseService(model);
    await expect(service.getById('x')).rejects.toBeInstanceOf(AppError);
  });

  test('update throws when not found', async () => {
    const model = { findByIdAndUpdate: jest.fn().mockResolvedValue(null) };
    const service = new BaseService(model);
    await expect(service.update('x', {})).rejects.toBeInstanceOf(AppError);
  });

  test('delete throws when not found', async () => {
    const model = { findByIdAndDelete: jest.fn().mockResolvedValue(null) };
    const service = new BaseService(model);
    await expect(service.delete('x')).rejects.toBeInstanceOf(AppError);
  });

  test('paginate returns paginated result', async () => {
    const model = { paginate: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
    const service = new BaseService(model);
    const result = await service.paginate({ page: 1, limit: 10 }, {});
    expect(result.total).toBe(0);
  });
});
