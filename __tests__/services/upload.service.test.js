/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const mongoose = require('mongoose');
const uploadService = require('../../Services/upload.service');
const Media = require('../../Models/media.model');
const Product = require('../../Models/product.model');
const User = require('../../Models/user.model');
const { AppError } = require('../../Utils/error.utils');
const { setupInMemoryMongo } = require('../index');

setupInMemoryMongo();

describe('UploadService', () => {
  test('uploadFile returns media info', async () => {
    process.env.BIZFLY_PUBLIC_URL = 'http://example.com';
    const sendSpy = jest.spyOn(uploadService.s3, 'send').mockResolvedValueOnce({});
    const createSpy = jest.spyOn(Media, 'create').mockResolvedValueOnce({ _id: 'm1' });
    const result = await uploadService.uploadFile({
      mimetype: 'image/png',
      originalname: 'a.png',
      buffer: Buffer.from('x'),
    });
    expect(result.mediaId).toBe('m1');
    sendSpy.mockRestore();
    createSpy.mockRestore();
  });

  test('uploadFile deletes object on MongoError and throws AppError', async () => {
    process.env.BIZFLY_PUBLIC_URL = 'http://example.com';
    const sendSpy = jest
      .spyOn(uploadService.s3, 'send')
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const createSpy = jest.spyOn(Media, 'create').mockRejectedValueOnce({
      name: 'MongoError',
      message: 'db',
    });
    await expect(
      uploadService.uploadFile({
        mimetype: 'image/png',
        originalname: 'a.png',
        buffer: Buffer.from('x'),
      })
    ).rejects.toBeInstanceOf(AppError);
    sendSpy.mockRestore();
    createSpy.mockRestore();
  });

  test('updateUserAvatar throws when user not found', async () => {
    const media = await Media.create({ url: 'u', type: 'IMAGE' });
    const getSpy = jest.spyOn(uploadService, 'getById').mockResolvedValueOnce(media);
    const userSpy = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValueOnce(null);
    const userId = new mongoose.Types.ObjectId();
    await expect(
      uploadService.updateUserAvatar(String(media._id), String(userId))
    ).rejects.toBeInstanceOf(AppError);
    getSpy.mockRestore();
    userSpy.mockRestore();
  });

  test('updateCategoryImage returns null when update returns null', async () => {
    const updateSpy = jest.spyOn(uploadService, 'update').mockResolvedValueOnce(null);
    const res = await uploadService.updateCategoryImage('m1', 'c1');
    expect(res).toBeNull();
    updateSpy.mockRestore();
  });

  test('uploadProductImages collects failures', async () => {
    const product = await Product.create({
      name: 'P',
      description: 'd',
      price: 10,
      status: 'APPROVED',
      isActive: true,
      createdBy: '507f1f77bcf86cd799439011',
      quantity: 2,
    });
    const media1 = await Media.create({ url: 'u1', type: 'IMAGE' });
    const media2 = await Media.create({ url: 'u2', type: 'IMAGE' });
    media1.updateOne = jest.fn().mockResolvedValueOnce({});
    media2.updateOne = jest.fn().mockRejectedValueOnce(new Error('fail'));
    const res = await uploadService.uploadProductImages(
      product,
      [media1._id, media2._id],
      [media1, media2]
    );
    expect(res.failed).toHaveLength(1);
  });
});
