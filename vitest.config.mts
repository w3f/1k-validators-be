import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 300000,
    retry: 5,
    setupFiles: ["packages/common/test/vitest.setup.ts"],
  },
});
