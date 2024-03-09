const esbuild = require("esbuild");

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: "node",
  target: "node18",
  outdir: "build",
  tsconfig: "tsconfig.json",
  splitting: true,
  format: "esm",
  chunkNames: "chunks/[name]-[hash]",
  sourcemap: false,
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

esbuild.build(buildOptions).catch((error) => {
  console.error(error);
  process.exit(1);
});
