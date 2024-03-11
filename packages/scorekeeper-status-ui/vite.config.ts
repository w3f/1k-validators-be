import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Custom plugin to suppress console output
const suppressConsole = () => {
  return {
    name: "suppress-console",
    configResolved(config) {
      if (config.command === "build") {
        // Suppress all console.log, console.warn, and optionally console.error outputs during build
        console.log = console.warn = console.error = () => {};
      }
    },
  };
};

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), suppressConsole()],
    build: {
      logLevel: "error", // Set log level to 'error' to minimize output
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
