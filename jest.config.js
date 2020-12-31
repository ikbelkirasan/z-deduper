module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 15000,
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  testMatch: ["**/src/**/?(*.)+(spec|test).[jt]s?(x)"],
};
