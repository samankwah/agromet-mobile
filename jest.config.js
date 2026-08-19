/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts', '<rootDir>/src/tests/**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
