module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.unit.test.ts", "../*.mock.ts"],
  collectCoverage: true,
  // Optional: configure the directories and file patterns to include or exclude
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}", // Adjust the pattern to match your project's file structure
    "!src/**/*.test.{js,jsx,ts,tsx}", // Exclude test files
    // Add more patterns to exclude or include files as needed
  ],
};
