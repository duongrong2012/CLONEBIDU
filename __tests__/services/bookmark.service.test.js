/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const bookmarkService = require('../../Services/bookmark.service');
const User = require('../../Models/user.model');
const { AppError } = require('../../Utils/error.utils');
const { MESSAGES } = require('../../Utils/constant');

describe('BookmarkService', () => {
  test('addBookmark throws when user not found', async () => {
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValueOnce(null);
    await expect(bookmarkService.addBookmark('u1', 'p1')).rejects.toBeInstanceOf(AppError);
    spy.mockRestore();
  });

  test('addBookmark throws when DB error', async () => {
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('db'));
    await expect(bookmarkService.addBookmark('u1', 'p1')).rejects.toMatchObject({
      message: 'Failed to add bookmark',
    });
    spy.mockRestore();
  });

  test('removeBookmark throws when user not found', async () => {
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValueOnce(null);
    await expect(bookmarkService.removeBookmark('u1', 'p1')).rejects.toBeInstanceOf(AppError);
    spy.mockRestore();
  });

  test('removeBookmark throws when DB error', async () => {
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('db'));
    await expect(bookmarkService.removeBookmark('u1', 'p1')).rejects.toMatchObject({
      message: 'Failed to remove bookmark',
    });
    spy.mockRestore();
  });
});
