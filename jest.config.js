/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  verbose: false,
  roots: ['<rootDir>'],
  collectCoverage: true,
  collectCoverageFrom: [
    'Controllers/**/*.js',
    'Middlewares/**/*.js',
    'Models/**/*.js',
    'Routes/**/*.js',
    'Services/**/*.js',
    'Utils/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/seeders/**',
    '!**/OpenApi/**',
    '!**/docs/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
