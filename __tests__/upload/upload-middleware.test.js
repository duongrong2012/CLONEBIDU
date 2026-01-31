/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const {
  validateFileUpload,
  handleValidationErrors,
} = require('../../Middlewares/upload.middleware');
const { MEDIA_TYPE } = require('../../Utils/constant');

describe('Upload middleware - validateFileUpload/handleValidationErrors', () => {
  test('throws when no files uploaded', async () => {
    const req = { files: [] };
    await validateFileUpload()[0].run(req);
    expect(() => handleValidationErrors(req, {}, () => {})).toThrow('No files uploaded');
  });

  test('assigns folder based on mimetype and passes validation', async () => {
    const req = {
      files: [{ mimetype: 'image/png' }, { mimetype: 'video/mp4' }],
    };
    await validateFileUpload()[0].run(req);
    const next = jest.fn();
    handleValidationErrors(req, {}, next);
    expect(req.files[0].folder).toBe(MEDIA_TYPE.IMAGE);
    expect(req.files[1].folder).toBe(MEDIA_TYPE.VIDEO);
    expect(next).toHaveBeenCalled();
  });
});
