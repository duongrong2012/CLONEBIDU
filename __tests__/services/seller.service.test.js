/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const sellerService = require('../../Services/seller.service');
const BecomeSellerRequest = require('../../Models/becomeSellerRequest.model');
const { setupInMemoryMongo } = require('../index');
const { SELLER_REQUEST_STATUS } = require('../../Utils/constant');

setupInMemoryMongo();

describe('SellerService', () => {
  test('getAllRequests filters by status', async () => {
    await BecomeSellerRequest.create({
      user: '507f1f77bcf86cd799439011',
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await sellerService.getAllRequests({ status: SELLER_REQUEST_STATUS.PENDING });
    expect(res.data.length).toBe(1);
  });

  test('getMyRequests filters by status', async () => {
    const userId = '507f1f77bcf86cd799439011';
    await BecomeSellerRequest.create({
      user: userId,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await sellerService.getMyRequests(userId, {
      status: SELLER_REQUEST_STATUS.PENDING,
    });
    expect(res.data.length).toBe(1);
  });
});
