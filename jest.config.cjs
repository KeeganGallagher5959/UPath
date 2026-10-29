/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testTimeout: 15_000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
