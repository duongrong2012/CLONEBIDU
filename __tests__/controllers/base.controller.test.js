/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const BaseController = require('../../Controllers/base.controller');

function mockRes() {
  return {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe('BaseController', () => {
  test('create returns 201 with payload', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: 1 }) };
    const controller = new BaseController(service);
    const req = { body: { name: 'x' } };
    const res = mockRes();
    await controller.create(req, res, () => {});
    expect(res.statusCode).toBe(201);
    expect(res.payload.payload).toEqual({ id: 1 });
  });

  test('getAll calls next on error', async () => {
    const service = { getAll: jest.fn().mockRejectedValue(new Error('fail')) };
    const controller = new BaseController(service);
    const next = jest.fn();
    await controller.getAll({ query: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('getById calls next on error', async () => {
    const service = { getById: jest.fn().mockRejectedValue(new Error('fail')) };
    const controller = new BaseController(service);
    const next = jest.fn();
    await controller.getById({ params: { id: '1' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('update calls next on error', async () => {
    const service = { update: jest.fn().mockRejectedValue(new Error('fail')) };
    const controller = new BaseController(service);
    const next = jest.fn();
    await controller.update({ params: { id: '1' }, body: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('delete calls next on error', async () => {
    const service = { delete: jest.fn().mockRejectedValue(new Error('fail')) };
    const controller = new BaseController(service);
    const next = jest.fn();
    await controller.delete({ params: { id: '1' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
