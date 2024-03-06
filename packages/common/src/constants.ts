/// One week in milliseconds.
import WS from "ws";

export const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;

export const FIVE_MINUTES = 5 * 60 * 1000;

export const WEEK = 7 * 24 * 60 * 60 * 1000;

/// The time a node has to make an upgrade to the latest release.
export const SIXTEEN_HOURS = 16 * 60 * 60 * 1000;

export const GATEWAY_CACHE_TTL = 18 * 1000;

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
export const POLKADOT_API_TIMEOUT = 1000000;

export const CHAINDATA_RETRIES = 20;

export const CHAINDATA_SLEEP = 300;

export const API_PROVIDER_TIMEOUT = 10000;

// The number of eras a nominator should wait until making a next nomination
export const NOMINATOR_SHOULD_NOMINATE_ERAS_THRESHOLD = 1;

/// List of Kusama endpoints we can switch between.
export const KusamaEndpoints = [
  "wss://kusama-rpc-tn.dwellir.com",
  "wss://kusama-rpc.dwellir.com",
  "wss://kusama.public.curie.radiumblock.xyz/ws",
  "wss://rpc.ibp.network/kusama",
  "wss://rpc.dotters.network/kusama",
  "wss://ksm-rpc.stakeworld.io",
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

export const defaultWsOptions = {
  WebSocket: WS,
  connectionTimeout: 0,
  maxRetries: 15,
  debug: true,
};

// 200 hours in milliseconds
export const STALE_TELEMETRY_THRESHOLD = 720000000;

export const DEFAULT_TELEMETRY_ENDPONT =
  "wss://telemetry.w3f.community/submit/";

// List of log labels that are omitted from logging
export const defaultExcludeLabels = [
  // "Telemetry",
  // "Location",
  // "ValidatorPrefJob",
  "Block",
  "Gateway",
];

/// Endpoint of the Kusama Thousand Validators backend. Used for the Polkadot program.
export const KOTVBackendEndpoint = "https://kusama.w3f.community";

// The number of blocks for a time delay proxy. Default is 10850, or ~18 hours
export const TIME_DELAY_BLOCKS = 10850;

// The number of blocks after a time delay proxy call was announced that we want to cancel the tx. Should be 36 hours
export const CANCEL_THRESHOLD = 21700;

// Monitor Cron job for checking if clients have upgraded. This runs ever 3 minutes by default
export const MONITOR_CRON = "0 */3 * * * *";

// Clear Offline Time Cron Job. This runs once every sunday  by default
// export const CLEAR_OFFLINE_CRON = "0 0 0 * * 0";
export const CLEAR_OFFLINE_CRON = "0 0 * * * *";

// Validity Cron Job. This runs every 20 minutes by default
export const VALIDITY_CRON = "0 0-59/5 * * * *";

// Execution Cron Job. This runs every 15 minutes by default
export const EXECUTION_CRON = "0 0-59/3 * * * *";

// Scorekeeper Cron Job. This runs every 30 minutes by default
export const SCOREKEEPER_CRON = "0 0-59/5 * * * *";

// Reward claiming frequency. This runs every 45 minutes by default
export const REWARD_CLAIMING_CRON = "0 0-59/45 * * * *";

// Cancel Frequency. This runs every 25 minutes by default
export const CANCEL_CRON = "0 0-59/25 * * * *";

// Stale Nomination Frequency. This runs every 45 minutes by default
export const STALE_CRON = "0 0-59/5 * * * *";

// Score Cron Job. This runs every 5 minutes by default
export const SCORE_CRON = "0 0-59/5 * * * *";

// Era Stats Cron Job. This runs every 5 minutes by default
export const ERA_STATS_CRON = "0 0-59/1 * * * *";

// Location Stats Cron Job. This runs every 15 minutes by default
export const LOCATION_STATS_CRON = "0 0-59/5 * * * *";

// Chain Querying Cron Jobs:

// Era Points Cron Job. This runs every 15 minutes by default
export const ERA_POINTS_CRON = "0 0-59/15 * * * *";

// Active Validator Cron Job. This runs ever 12 minutes by default
export const ACTIVE_VALIDATOR_CRON = "0 0-59/5 * * * *";

// Inclusion Cron Job
export const INCLUSION_CRON = "0 0-59/5 * * * *";

// Unclaimed Era Cron Job. This runs every hour by default
export const UNCLAIMED_ERAS_CRON = "0 0 0-23/1 * * *";

// Validator Pref Cron Job. This runs every 15 minutes by default
export const VALIDATOR_PREF_CRON = "0 0-59/3 * * * *";

// Sesion Key Cron Job. This runs every 15 minutes by default
export const SESSION_KEY_CRON = "0 0-59/5 * * * *";

// Nominator Cron Job. This runs every 15 minutes by default
export const NOMINATOR_CRON = "0 0-59/5 * * * *";

export const BLOCK_CRON = "0 0-59/1 * * * *";

export const LOCATION_URL = "https://ipinfo.io/";

// Score Constant Defaults
export const INCLUSION_WEIGHT = 220;
export const SPAN_INCLUSION_WEIGHT = 220;
export const DISCOVERED_WEIGHT = 5;
export const NOMINATED_WEIGHT = 80;
export const RANK_WEIGHT = 5;
export const UNCLAIMED_WEIGHT = 10;
export const BONDED_WEIGHT = 50;
export const FAULTS_WEIGHT = 5;
export const OFFLINE_WEIGHT = 2;
export const LOCATION_WEIGHT = 40;
export const REGION_WEIGHT = 10;
export const COUNTRY_WEIGHT = 10;
export const PROVIDER_WEIGHT = 100;
export const NOMINATIONS_WEIGHT = 100;
export const RPC_WEIGHT = 100;
export const CLIENT_WEIGHT = 200;
export const RANDOMNESS_MULTIPLIER = 0.15;

export const USE_INCLUSION = true;
export const USE_SPAN_INCLUSION = true;
export const USE_DISCOVERED = true;
export const USE_NOMINATED = true;
export const USE_RANK = true;
export const USE_UNCLAIMED = true;
export const USE_BONDED = true;
export const USE_FAULTS = true;
export const USE_OFFLINE = true;
export const USE_LOCATION = true;
export const USE_REGION = true;
export const USE_COUNTRY = true;
export const USE_PROVIDER = true;
export const USE_NOMINATIONS = true;
export const USE_RPC = true;
export const USE_CLIENT = true;
