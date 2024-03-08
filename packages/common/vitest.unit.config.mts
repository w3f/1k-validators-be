import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*/*.unit.test.ts"],
    environment: "node",
    testTimeout: 300000,
    retry: 5,
    setupFiles: ["test/vitest.setup.ts"],
  },
});
