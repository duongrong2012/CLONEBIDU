/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const response = require('../../Utils/response.utils');

describe('response.utils', () => {
  test('paginate returns pagination response', () => {
    const res = response.paginate('ok', [{ id: 1 }], {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(res.pagination.total).toBe(1);
    expect(res.data).toHaveLength(1);
  });
});
