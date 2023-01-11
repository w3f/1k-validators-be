/// 15% in per billion type.
export const FIFTEEN_PERCENT = 150000000;

/// 5% in per billion type.
export const FIVE_PERCENT = 50000000;

/// 10 KSM with decimals.
export const TEN_KSM: number = 10 * 10 ** 12;

/// 50 KSM with decimals.
export const FIFTY_KSM: number = 50 * 10 ** 12;

/// 10_000 DOT with decimals.
export const TEN_THOUSAND_DOT: number = 10 * 1000 * 10 ** 10;

/// 5_000 DOT with decimals.
export const FIVE_THOUSAND_DOT: number = 5 * 1000 * 10 ** 10;

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
export const KUSAMA_REWARD_THRESHOLD = 20;

export const POLKADOT_REWARD_THRESHOLD = 4;

/// On Kusama eras are 6 hours with 6 second blocks.
export const KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS = 3600;

/// On Polkadot eras are 24 hours with 6 second blocks.
export const POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS = 14400;

/// On a Local Testnet eras are 2 minutes with 3 second blocks.
export const TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS = 40;

// The buffer % we want to remain free in an account - 0.2%
export const BALANCE_BUFFER_PERCENT = 0.002;

// the buffer hard stop - 20 tokens
export const BALANCE_BUFFER_AMOUNT = 20;

// Timeout threshold for polkadot js api - 360 seconds
export const POLKADOT_API_TIMEOUT = 360000;

/// List of Kusama endpoints we can switch between.
export const KusamaEndpoints = [
  "wss://kusama-rpc.polkadot.io",
  "wss://kusama.api.onfinality.io/public-ws",
];

/// List of Polkadot endpoints we can switch between.
export const PolkadotEndpoints = [
  "wss://rpc.polkadot.io",
  "wss://polkadot.api.onfinality.io/public-ws",
];

// List of Local endpoints we can switch between.
export const LocalEndpoints = [
  "ws://172.28.1.1:9944",
  "ws://172.28.1.2:9945",
  "ws://172.28.1.3:9946",
  "ws://172.28.1.4:9947",
];

/// Endpoint of the Kusama Thousand Validators backend. Used for the Polkadot program.
export const KOTVBackendEndpoint = "https://kusama.w3f.community";

// The number of blocks for a time delay proxy. Default is 10850, or ~18 hours
export const TIME_DELAY_BLOCKS = 10820;

// The number of blocks after a time delay proxy call was announced that we want to cancel the tx. Should be 36 hours
export const CANCEL_THRESHOLD = 21700;

export const KUSAMA_NOMINATOR_THRESHOLD = 2;

export const POLKADOT_NOMINATOR_THRESHOLD = 10;

// Monitor Cron job for checking if clients have upgraded. This runs ever 15 minutes by default
export const MONITOR_CRON = "0 */15 * * * *";

// Clear Offline Time Cron Job. This runs once every sunday  by default
// export const CLEAR_OFFLINE_CRON = "0 0 0 * * 0";
export const CLEAR_OFFLINE_CRON = "0 0 * * * *";

// Validity Cron Job. This runs every 20 minutes by default
export const VALIDITY_CRON = "0 0-59/5 * * * *";

// Execution Cron Job. This runs every 15 minutes by default
export const EXECUTION_CRON = "0 0-59/15 * * * *";

// Scorekeeper Cron Job. This runs every 30 minutes by default
export const SCOREKEEPER_CRON = "0 0-59/10 * * * *";

// Reward claiming frequency. This runs every 45 minutes by default
export const REWARD_CLAIMING_CRON = "0 0-59/45 * * * *";

// Cancel Frequency. This runs every 25 minutes by default
export const CANCEL_CRON = "0 0-59/25 * * * *";

// Stale Nomination Frequency. This runs every 45 minutes by default
export const STALE_CRON = "0 0-59/45 * * * *";

// Score Cron Job. This runs every 5 minutes by default
export const SCORE_CRON = "0 */5 * * * *";

// Era Stats Cron Job. This runs every 5 minutes by default
export const ERA_STATS_CRON = "0 0-59/3 * * * *";

// Location Stats Cron Job. This runs every 15 minutes by default
export const LOCATION_STATS_CRON = "0 0-59/3 * * * *";

// Chain Querying Cron Jobs:

// Era Points Cron Job. This runs every 45 minutes by default
export const ERA_POINTS_CRON = "0 0-59/45 * * * *";

// Active Validator Cron Job. This runs ever 12 minutes by default
export const ACTIVE_VALIDATOR_CRON = "0 0-59/12 * * * *";

// Inclusion Cron Job. This runs every hour by default
// export const INCLUSION_CRON = "0 0 0-23/1 * * *";
export const INCLUSION_CRON = "0 0-59/35 * * * *";

// Unclaimed Era Cron Job. This runs every hour by default
export const UNCLAIMED_ERAS_CRON = "0 0 0-23/1 * * *";

// Validator Pref Cron Job. This runs every 15 minutes by default
export const VALIDATOR_PREF_CRON = "0 0-59/15 * * * *";

// Sesion Key Cron Job. This runs every 45 minutes by default
export const SESSION_KEY_CRON = "0 0-59/45 * * * *";

// Council Cron Job. This runs every 15 minutes by default
export const COUNCIL_CRON = "0 0-59/25 * * * *";

// Subscan Cron Job. This runs every 10 minutes by default
export const SUBSCAN_CRON = "0 0-59/10 * * * *";

// Democracy Cron Job. This runs every 15 minutes by default
export const DEMOCRACY_CRON = "0 0-59/5 * * * *";

// Nominator Cron Job. This runs every 15 minutes by default
export const NOMINATOR_CRON = "0 0-59/17 * * * *";

// Delegation Cron Job. This runs every 20 minutes by default
export const DELEGATION_CRON = "0 0-59/3 * * * *";

// Delegation Cron Job. This runs every 25 minutes by default
export const BLOCK_CRON = "0 0-59/25 * * * *";

export const LOCATION_URL = "https://ipinfo.io/";
