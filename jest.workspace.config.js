module.exports = {
  projects: [
    "<rootDir>/packages/common/jest.unit.config.js",
    "<rootDir>/packages/core/jest.unit.config.js",
    "<rootDir>/packages/common/jest.int.config.js",
    "<rootDir>/packages/core/jest.int.config.js",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}", // Adjust the pattern to match your project's file structure
    "!src/**/*.test.{js,jsx,ts,tsx}", // Exclude test files
    // Add more patterns to exclude or include files as needed
  ],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  setupFilesAfterEnv: ["<rootDir>/packages/common/test/jest.setup.js"],
};
