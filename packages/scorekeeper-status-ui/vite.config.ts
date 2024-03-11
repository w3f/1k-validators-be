import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const suppressConsole = () => {
  return {
    name: "suppress-console",
    configResolved(config) {
      if (config.command === "build") {
        console.log = console.warn = console.error = () => {};
      }
    },
  };
};

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), suppressConsole()],
    build: {
      logLevel: "error",
      onwarn(warning, warn) {
        // Intentionally left blank to suppress warnings
      },
      ...(mode === "production" && {
        minify: "terser",
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
