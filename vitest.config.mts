import {defineConfig} from "vitest/config";


export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 300000,
    retry: 5,
    setupFiles: ["packages/common/test/vitest.setup.ts"],
    coverage: {
      provider: 'istanbul', // or 'v8'
      exclude: ['/docs/**', 'node_modules/**']
    },


    // @ts-ignore
    common: {
      include: ["packages/common/**/*.test.ts"],
      setupFiles: ["packages/common/test/vitest.setup.ts"],
      exclude: ["node_modules/**", "dist/**", "packages/scorekeeper-status-ui/**", "docs/**"],
    },

    // @ts-ignore
    telemetry: {
      include: ["packages/telemetry/**/*.test.ts"],
      setupFiles: ["packages/telemetry/test/vitest.setup.ts"],
      exclude: ["node_modules/**", "dist/**", "packages/scorekeeper-status-ui/**", "docs/**"],
    },

  },
});
