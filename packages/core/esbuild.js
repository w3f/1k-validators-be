const esbuild = require("esbuild");

// Add all the dynamically required packages to the external array
const externalPackages = [
  "@polkadot/api-augment",
  "velocityjs",
  "dustjs-linkedin",
  "atpl",
  "liquor",
  "twig",
  "eco",
  "jazz",
  "jqtpl",
  "hamljs",
  "hamlet",
  "whiskers",
  "haml-coffee",
  "hogan.js",
  "templayed",
  "underscore",
  "walrus",
  "mustache",
  "just",
  "ect",
  "mote",
  "toffee",
  "dot",
  "bracket-template",
  "ractive",
  "htmling",
  "babel-core",
  "plates",
  "vash",
  "slm",
  "marko",
  "teacup/lib/express",
  "coffee-script",
  "squirrelly",
  "twing",
  "matris-js-sdk",
];

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: "node",
  target: "node18",
  outdir: "build",
  external: externalPackages,
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
