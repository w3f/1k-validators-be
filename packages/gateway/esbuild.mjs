import esbuild from "esbuild";
import packageJson from '../../package.json' assert {type: 'json'};

const deps = Object.keys(packageJson.dependencies || {});


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
  "@1kv/telemetry",
  "@1kv/gateway",
  "tty",
  "koa",
  "coingecko-api-v3",
    "node-mongodb-native",
    "mongoose",
    "events"
    "@bull-board"
    // "@1kv/common"
];

const isProduction = process.argv.includes("--prod");

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: isProduction,
  platform: "node",
  target: "node18",
  external: [...deps, ...externalPackages],
  outdir: "build",
  tsconfig: "tsconfig.json",
  splitting: false,
  format: "esm",
  chunkNames: "chunks/[name]-[hash]",
  sourcemap: !isProduction,
  logLevel: "info",
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
