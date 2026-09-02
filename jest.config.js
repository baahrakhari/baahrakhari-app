module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  /** Mounting the whole App tree is slow; the default 5s is too tight. */
  testTimeout: 30000,
};
