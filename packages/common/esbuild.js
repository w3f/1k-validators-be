const esbuild = require("esbuild");

// Check if the --prod flag is included in the command line arguments
const isProduction = process.argv.includes("--prod");

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: isProduction, // Enable minification for production
  platform: "node",
  target: "node18",
  external: ["@polkadot/api-augment", "coingecko-api-v3"],
  outdir: "build",
  tsconfig: "tsconfig.json",
  splitting: true,
  format: "esm",
  chunkNames: "chunks/[name]-[hash]",
  sourcemap: !isProduction, // Disable source maps for production
  logLevel: "error",
};

if (process.argv.includes("--watch")) {
  buildOptions.watch = {
    onRebuild(error, result) {
      if (error) console.error("watch build failed:", error);
      else
        console.log(
          "watch build succeeded at",
          new Date().toLocaleTimeString(),
        );
    },
  };
  console.log("watch mode enabled");
}

// Additional production-specific configurations can be added here
if (isProduction) {
  // Example: Define environment variables for production
  buildOptions.define = {
    "process.env.NODE_ENV": "'production'",
  };
}

esbuild.build(buildOptions).catch((error) => {
  console.error(error);
  process.exit(1);
});
