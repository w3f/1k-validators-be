/// 10% in per billion type.
export const TEN_PERCENT = 100000000;

/// 3% in per billion type.
export const THREE_PERCENT = 30000000;

/// 50 KSM with decimals.
export const FIFTY_KSM: number = 50 * 10 ** 12;

/// 10_000 DOT with decimals.
export const TEN_THOUSAND_DOT: number = 10 * 1000 * 10 ** 10;

/// One week in milliseconds.
export const WEEK = 7 * 24 * 60 * 60 * 1000;

/// The time a node has to make an upgrade to the latest release.
export const SIXTEEN_HOURS = 16 * 60 * 60 * 1000;

/// Percentage of one week that a validator could be offline.
export const UP_TIME = 0.02;

/// Number of Eras in 4 days that a validator should have claimed all previous rewards except
export const KUSAMA_FOUR_DAYS_ERAS = 16;

/// Number of Eras in 4 days that a validator should have claimed all previous rewards except
export const POLKADOT_FOUR_DAYS_ERAS = 4;

/// On Kusama eras are 6 hours with 6 second blocks.
export const KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS = 3600;

/// List of Kusama endpoints we can switch between.
export const KusamaEndpoints = ["wss://kusama-rpc.polkadot.io"];

/// List of Polkadot endpoints we can switch between.
export const PolkadotEndpoints = ["wss://rpc.polkadot.io"];

// List of Local endpoints we can switch between.
export const LocalEndpoints = ["ws://172.28.1.1:9944"];

/// Endpoint of the Kusama Thousand Validators backend. Used for the Polkadot program.
export const KOTVBackendEndpoint = "https://kusama.w3f.community";
