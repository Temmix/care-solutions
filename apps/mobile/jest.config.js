/** Lightweight unit-test setup for pure logic (offline queue, clock window).
 * Uses ts-jest in a node env; native modules are mocked per-test, so we avoid
 * the heavier jest-expo/React Native transform pipeline. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
