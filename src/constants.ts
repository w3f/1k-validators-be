/// 10% in per billion type.
export const TEN_PERCENT = 100000000;

/// 50 KSM with decimals.
export const FIFTY_KSM: number = 50 * 10 ** 12;

/// One week in milliseconds.
export const WEEK = 7 * 24 * 60 * 60 * 1000;

/// The time a node has to make an upgrade to the latest release.
export const SIXTEEN_HOURS = 16 * 60 * 60 * 1000;

/// Percentage of one week that a validator could be offline.
export const UP_TIME = 0.02;

/// On Kusama eras are 6 hours with 6 second blocks.
export const KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS = 3600;

/// List of Kusama endpoints we can switch between.
export const KusamaEndpoints = [
  "wss://cc3-1.kusama.network",
  "wss://cc3-2.kusama.network",
  "wss://cc3-3.kusama.network",
  "wss://cc3-4.kusama.network",
  "wss://cc3-5.kusama.network",
];
