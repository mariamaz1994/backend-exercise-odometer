// jest.config.js
const { createDefaultPreset } = require("ts-jest");

module.exports = {
  testEnvironment: "node",
  transform: { ...createDefaultPreset().transform },
  testPathIgnorePatterns: ["/node_modules/"],
};