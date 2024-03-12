const esbuild = require("esbuild");

const isProduction = process.argv.includes("--prod");

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: isProduction,
  platform: "node",
  target: "node18",
  external: ["@polkadot/api-augment", "coingecko-api-v3"],
  outdir: "build",
  tsconfig: "tsconfig.json",
  splitting: true,
  format: "esm",
  chunkNames: "chunks/[name]-[hash]",
  sourcemap: !isProduction,
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

if (isProduction) {
  buildOptions.define = {
    "process.env.NODE_ENV": "'production'",
  };
}

esbuild.build(buildOptions).catch((error) => {
  console.error(error);
  process.exit(1);
});
