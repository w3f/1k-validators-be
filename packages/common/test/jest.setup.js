const originalWarn = console.warn;

console.warn = (...args) => {
  // List of suppressed warnings (updated to include new warnings)
  const suppressedWarnings = [
    "@polkadot/util has multiple versions",
    "@polkadot/keyring has multiple versions",
    "@polkadot/util-crypto has multiple versions",
    "@polkadot/wasm-crypto has multiple versions",
    "@polkadot/wasm-bridge has multiple versions",
    "@polkadot/wasm-crypto-wasm has multiple versions",
    "@polkadot/wasm-util has multiple versions",
    "@polkadot/api-augment has multiple versions",
    "@polkadot/rpc-augment has multiple versions",
    "@polkadot/types-augment has multiple versions",
    "@polkadot/api has multiple versions",
    "@polkadot/rpc-provider has multiple versions",
    "@polkadot/api-derive has multiple versions",
    "@polkadot/rpc-core has multiple versions",
    "@polkadot/types has multiple versions",
    "@polkadot/types-create has multiple versions",
    "@polkadot/types-codec has multiple versions",
    "@polkadot/types-known has multiple versions",
    // Any other warnings you want to suppress
  ];

  const isSuppressed = suppressedWarnings.some((warning) =>
    args[0].includes(warning),
  );

  if (!isSuppressed) {
    originalWarn.apply(console, args);
  }
};
