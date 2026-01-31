/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const buyerService = require('../../Services/buyer.service');
const User = require('../../Models/user.model');
const { AppError } = require('../../Utils/error.utils');

describe('BuyerService', () => {
  test('updateUserById throws when user not found', async () => {
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValueOnce(null);
    await expect(buyerService.updateUserById('u1', { firstName: 'A' })).rejects.toBeInstanceOf(
      AppError
    );
    spy.mockRestore();
  });
});
