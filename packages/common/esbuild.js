import esbuild from "esbuild";

const isProduction = process.argv.includes("--prod");

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
  "@1kv/common",
  "mongoose",
  "logform",
  "winston",
  "ws",
  "form-data",
  "combined-stream",
  "proxy-from-env",
  "follow-redirects",
  "cron",
  "coingecko-api-v3",
  "matrix-js-sdk",
  "node-mongodb-native",
  "mongoose",
];

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: isProduction,
  platform: "node",
  target: "node18",
  external: externalPackages,
  outdir: "build",
  tsconfig: "tsconfig.json",
  // splitting: true,
  format: "esm",
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
