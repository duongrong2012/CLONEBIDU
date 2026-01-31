/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const buyerController = require('../../Controllers/buyer.controller');
const buyerService = require('../../Services/buyer.service');

describe('BuyerController', () => {
  test('getProfile calls next on error', async () => {
    const spy = jest.spyOn(buyerService, 'getUserById').mockRejectedValueOnce(new Error('fail'));
    const req = { user: { _id: 'u1' } };
    const next = jest.fn();
    await buyerController.getProfile(req, { json: jest.fn() }, next);
    expect(next).toHaveBeenCalled();
    spy.mockRestore();
  });
});
