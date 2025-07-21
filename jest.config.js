module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 15000, // For slower CI environments 
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};