import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*/*.int.test.ts"],
    environment: "node",
    testTimeout: 30000,
    retry: 10,
    setupFiles: ["test/vitest.setup.ts"],
  },
});
