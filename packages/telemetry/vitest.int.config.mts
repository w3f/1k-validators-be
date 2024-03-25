import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*/*.int.test.ts"],
        environment: "node",
        testTimeout: 130000,
        retry: 1,
        setupFiles: ["test/vitest.setup.ts"],
        maxConcurrency: 1,
    },
});
