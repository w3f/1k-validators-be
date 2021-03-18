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

// Number of eras that a validator can have unclaimed rewards for until the backend tries to claim them
export const REWARD_CLAIMING_THRESHOLD = 64;

/// On Kusama eras are 6 hours with 6 second blocks.
export const KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS = 3600;

/// On Polkadot eras are 24 hours with 6 second blocks.
export const POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS = 14400;

/// On a Local Testnet eras are 3 minutes with 3 second blocks.
export const TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS = 60;

/// List of Kusama endpoints we can switch between.
export const KusamaEndpoints = ["wss://kusama-rpc.polkadot.io"];

/// List of Polkadot endpoints we can switch between.
export const PolkadotEndpoints = ["wss://rpc.polkadot.io"];

// List of Local endpoints we can switch between.
export const LocalEndpoints = ["ws://172.28.1.1:9944"];

/// Endpoint of the Kusama Thousand Validators backend. Used for the Polkadot program.
export const KOTVBackendEndpoint = "https://kusama.w3f.community";

// The number of blocks for a time delay proxy. Default is 10850, or ~18 hours
export const TIME_DELAY_BLOCKS = 10850;

// Monitor Cron job for checking if clients have upgraded. This runs ever 15 minutes by default
export const MONITOR_CRON = "0 */15 * * * *";

// Clear Offline Time Cron Job. This runs once every sunday  by default
export const CLEAR_OFFLINE_CRON = "0 0 0 * * 0";

// Validity Cron Job. This runs every 7 minutes by default
export const VALIDITY_CRON = "0 0-59/17 * * * *";

// Candidate ChainData Cron Job. This runs ever 5 minutes by default
export const CANDIDATE_CHAINDATA_CRON = "0 0-59/25 * * * *";

// Execution Cron Job. This runs every 15 minutes by default
export const EXECUTION_CRON = "0 0-59/15 * * * *";

// Scorekeeper Cron Job. This runs every 10 minutes by default
export const SCOREKEEPER_CRON = "0 0-59/10 * * * *";

// Reward claiming frequency. This runs every 30 minutes by default
export const REWARD_CLAIMING_CRON = "0 0-59/30 * * * *";
