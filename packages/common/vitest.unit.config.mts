import {defineConfig} from "vitest/config";

const isCI = process.env.CI === "true";

export default defineConfig({
  test: {
    include: ["**/*/*.unit.test.ts"],
    environment: "node",
    testTimeout: 700000,
    retry: 1,
    setupFiles: ["test/vitest.setup.ts"],
    // Set maxConcurrency based on environment
    maxConcurrency: isCI ? 1 : undefined,
    exclude: ["node_modules/**"]
  },
});
