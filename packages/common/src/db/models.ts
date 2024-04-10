import mongoose, { Schema } from "mongoose";
import { LocationStats as LStats, Stats } from "../constraints/score";

const FaultEventSchema = new Schema({
  // Timestamp when the fault happened.
  when: { type: Number },
  // The reason the fault took place.
  reason: String,
  // The previous rank before the deduction takes place
  prevRank: Number,
});

export interface DelayedTx {
  number: number;
  controller: string;
  targets: string[];
  callHash: string;
}

export const DelayedTxSchema = new Schema({
  // The block number the transaction was announced in
  number: Number,
  // The controller address
  controller: { type: String, index: true },
  // The validators to nominate
  targets: [String],
  callHash: String,
});

export const DelayedTxModel = mongoose.model("DelayedTx", DelayedTxSchema);

export interface SubIdentity {
  name: string;
  address: string;
}

export interface Identity {
  name: string;
  address: string;
  verified?: boolean;
  subIdentities?: SubIdentity[];
  display?: string;
  email?: string;
  image?: string;
  judgements?: string[];
  legal?: string;
  pgp?: string;
  riot?: string;
  twitter?: string;
  web?: string;
}
export const Identity = new Schema({
  name: { type: String, index: true },
  address: { type: String, index: true },
  verified: Boolean,
  subIdentities: [
    {
      name: String,
      address: { type: String, index: true },
    },
  ],
  display: String,
  email: String,
  image: String,
  judgements: [String],
  legal: String,
  pgp: String,
  riot: String,
  twitter: String,
  web: String,
});

export const IdentityModel = mongoose.model("Identity", Identity);

export enum InvalidityReasonType {
  ONLINE = "ONLINE",
  VALIDATE_INTENTION = "VALIDATE_INTENTION",
  CLIENT_UPGRADE = "CLIENT_UPGRADE",
  CONNECTION_TIME = "CONNECTION_TIME",
  IDENTITY = "IDENTITY",
  MULTIPLE_IDENTITIES = "MULTIPLE_IDENTITIES",
  ACCUMULATED_OFFLINE_TIME = "ACCUMULATED_OFFLINE_TIME",
  REWARD_DESTINATION = "REWARD_DESTINATION",
  COMMISION = "COMMISION",
  SELF_STAKE = "SELF_STAKE",
  UNCLAIMED_REWARDS = "UNCLAIMED_REWARDS",
  BLOCKED = "BLOCKED",
  KUSAMA_RANK = "KUSAMA_RANK",
  PROVIDER = "PROVIDER",
  BEEFY = "BEEFY",
  SANCTIONED_GEO_AREA = "SANCTIONED_GEO_AREA",
}

export interface InvalidityReason {
  valid?: boolean;
  type: InvalidityReasonType;
  details: any;
  updated?: number;
}

export const InvalidityReason = new Schema({
  valid: Boolean,
  type: {
    type: String,
    enum: [
      "ONLINE",
      "VALIDATE_INTENTION",
      "CLIENT_UPGRADE",
      "CONNECTION_TIME",
      "IDENTITY",
      "MULTIPLE_IDENTITIES",
      "ACCUMULATED_OFFLINE_TIME",
      "REWARD_DESTINATION",
      "COMMISION",
      "SELF_STAKE",
      "UNCLAIMED_REWARDS",
      "BLOCKED",
      "KUSAMA_RANK",
      "PROVIDER",
      "BEEFY",
      "SANCTIONED_GEO_AREA",
    ],
    default: "NEW",
  },
  details: {},
  updated: Number,
});

export const LatestSessionSchema = new Schema({
  session: Number,
  updated: Number,
});

export const LatestSessionModel = mongoose.model(
  "LatestSession",
  LatestSessionSchema,
);

export interface ValidatorSet {
  session: number;
  era: number;
  validators: string[];
}

export const ValidatorSetSchema = new Schema({
  session: Number,
  era: Number,
  validators: [String],
});

// Explicitly specify the collection name to ensure it uses the original collection
export const ValidatorSetModel = mongoose.model(
  "ValidatorSet", // New model name
  ValidatorSetSchema,
  "latestvalidatorsets", // Original collection name, typically the plural form of your original model name, lowercased
);

export interface Location {
  // The SlotId of the candidate
  slotId: number;
  // The Telemetry name of the candidate
  name: string;
  // The stash address of the candidate
  address: string;
  // The IP address of the candidate
  addr: string;
  port: number;
  city: string;
  region: string;
  country: string;
  provider: string;
  updated: number;
  session: number;
  source: string;
  vpn: boolean;
  cpu: string;
  memory: string;
  coreCount: string;
  vm: boolean;
  networkId?: string;
}

export const LocationSchema = new Schema({
  slotId: { type: Number, index: true }, // The Candidate SlotId
  name: { type: String, index: true }, // The Telemetry name of the node
  address: { type: String, index: true }, // The Validator Address
  addr: { type: String, index: true },
  port: Number,
  city: String,
  region: String,
  country: String,
  provider: String,
  updated: Number,
  session: { type: Number, index: true },
  source: String,
  vpn: Boolean,
  cpu: String,
  memory: String,
  coreCount: String,
  vm: Boolean,
  networkId: String,
});

export const LocationModel = mongoose.model("Location", LocationSchema);

export interface NominatorStake {
  validator: string;
  era: number;
  totalStake: number;
  inactiveStake: number;
  activeNominators: {
    address: string;
    bonded: number;
  }[];
  inactiveNominators: {
    address: string;
    bonded: number;
  }[];
  updated: number;
}

// Info about a validators nominations
export const NominatorStakeSchema = new Schema({
  validator: { type: String, index: true },
  era: Number,
  totalStake: Number,
  inactiveStake: Number,
  activeNominators: [
    {
      address: String,
      bonded: Number,
    },
  ],
  inactiveNominators: [
    {
      address: String,
      bonded: Number,
    },
  ],
  updated: Number,
});

NominatorStakeSchema.index({ validator: 1, era: -1 });
// NominatorStakeSchema.index({ era: -1 });

export const NominatorStakeModel = mongoose.model(
  "NominatorStake",
  NominatorStakeSchema,
);

export interface TelemetryNode {
  telemetryId: number;
  name: string;
  nodeRefs: number;
  version: string;
  discoveredAt: number;
  offlineSince: number;
  offlineAccumulated: number;
  onlineSince: number;
}

export const TelemetryNodeSchema = new Schema({
  telemetryId: { type: Number, index: true },
  name: { type: String, index: true },
  nodeRefs: Number,
  version: String,
  discoveredAt: { type: Number, default: 0 },
  offlineSince: { type: Number, default: 0 },
  offlineAccumulated: { type: Number, default: 0 },
  onlineSince: { type: Number, default: 0 },
});

export const TelemetryNodeModel = mongoose.model(
  "TelemetryNode",
  TelemetryNodeSchema,
);

export interface Candidate {
  slotId: number;
  kyc: boolean;
  telemetryId: number;
  nodeRefs: number;
  name: string;
  version: string;
  discoveredAt: number;
  nominatedAt: number;
  offlineSince: number;
  offlineAccumulated: number;
  onlineSince: number;
  updated: boolean;
  rank: number;
  faults: number;
  stash: string;
  controller: string;
  invalidityReasons: string;
  faultEvents: { when: string; reason: string; prevRank: number }[];
  unclaimedEras: number[];
  kusamaStash: string;
  inclusion: number;
  spanInclusion: number;
  valid: boolean;
  lastValid: number;
  commission: number;
  identity: Identity;
  active: boolean;
  rewardDestination: string;
  queuedKeys: string;
  nextKeys: string;
  bonded: number;
  skipSelfStake: boolean;
  invalidity: InvalidityReason[];
  matrix: string[];
  implementation: string;
}

export const CandidateSchema = new Schema({
  // The unique identifier of the candidate's node for a given slot.
  slotId: { type: Number, index: true },
  // Whether the candidate has been verified to have passed KYC
  kyc: Boolean,
  // The inherited telemetry ID.
  telemetryId: Number,
  // The number of nodes that are online for this candidate (this handles upgrade situations).
  nodeRefs: Number,
  // The name registered on the candidates list.
  name: { type: String, index: true },
  // Stores the version string directly.
  version: String,
  // The origin of the node's connection time (timestamp in ms).
  discoveredAt: { type: Number, default: 0 },
  // The last timestamp the node was nominated (if ever).
  nominatedAt: { type: Number, default: 0 },
  // The timestamp for when the node went offline (if ever).
  offlineSince: { type: Number, default: 0 },
  // The cumulative duration of offline time (in ms).
  offlineAccumulated: { type: Number, default: 0 },
  // The timestamp for the most recent time the node has come online. TOFIX: wrong name, SINCE is misleading -> lastSeenOnline
  onlineSince: { type: Number, default: 0 },
  // Whether it is running the latest client code.
  updated: { type: Boolean, default: false },
  // The number of nomination rounds the node has done well.
  rank: { type: Number, default: 0 },
  // The number of times that the node has been found to have done something
  // wrong during a nomination round.
  faults: { type: Number, default: 0 },
  // The stash account of the candidate. May be empty if no stash is registered.
  stash: { type: String, index: true },
  // The controller of the candidates
  controller: String,
  // The reasons a candidate is not meeting the programme requirements.
  invalidityReasons: { type: String, default: "" },
  // If a validator has faults, this will contain the details.
  faultEvents: { type: [FaultEventSchema], default: [] },
  // Unclaimed Era Rewards
  unclaimedEras: { type: [Number], default: [] },
  // Polkadot specific: Kusama Stash
  kusamaStash: String,
  // Inclusion percentage - the percent of eras active of the last 84 eras
  inclusion: { type: Number, default: 0.0 },
  // Span Inclusion percentage - the percent of eras active of the last 28 eras
  spanInclusion: { type: Number, default: 0.0 },
  // whether the node is valid or not
  valid: Boolean,
  // The last time the validator was deemed valid
  lastValid: Number,
  // Validator's commission
  commission: Number,
  // The validators identity,
  identity: Identity,
  // If the validator is currently active in the set
  active: Boolean,
  // The destination rewards go to
  rewardDestination: String,
  // The queued session keys
  queuedKeys: String,
  // Next Session Keys
  nextKeys: String,
  // the amount of funds the validator has bonded
  bonded: Number,
  // case for good intentions
  skipSelfStake: Boolean,
  // array of invalidity reasons
  invalidity: [InvalidityReason],
  matrix: [String],
  implementation: String,
});

export const CandidateModel = mongoose.model("Candidate", CandidateSchema);

export interface Era {
  lastNominatedEraIndex: string;
  nextNomination: number;
  when: number;
}

export const EraSchema = new Schema({
  // The last era a nomination took place
  lastNominatedEraIndex: { type: String, default: "0" },
  // ~ 24 hours from the last time a nomination occured.
  nextNomination: Number,
  // The time that lastNominatedEraIndex was set
  when: Number,
});

export const EraModel = mongoose.model("Era", EraSchema);

export interface Nominator {
  address: string;
  stash?: string;
  proxy?: string;
  bonded?: number;
  avgStake?: number;
  nominateAmount?: number;
  proxyDelay?: number;
  rewardDestination?: string;
  newBondedAmount?: number;
  current?: { name?: string; stash?: string; identity?: any }[];
  lastNomination?: number;
  createdAt?: number;
  now?: number;
}

export const NominatorSchema = new Schema({
  // The controller address
  address: String,
  // The Stash address
  stash: String,
  // The nominator proxy account
  proxy: String,
  // The amount bonded
  bonded: Number,
  // The average amount of human denominated stake the nominator can get all it's nominations in the set with
  avgStake: { type: Number, default: 0 },
  // The estimated amount of nomiantors to nominate
  nominateAmount: { type: Number, default: 0 },
  // the amount of blocks of time delay
  proxyDelay: Number,
  // the reward destination
  rewardDestination: String,
  // The amount the account should change for it's bonding
  newBondedAmount: Number,
  current: [],
  lastNomination: { type: Number, default: 0 },
  createdAt: { type: Number, default: 0 },
});

export const NominatorModel = mongoose.model("Nominator", NominatorSchema);

export interface ChainMetadata {
  decimals: number;
  name: string;
}

export const ChainMetadataSchema = new Schema({
  // Number of decimals
  decimals: Number,
  // Chain name
  name: String,
});

export const ChainMetadataModel = mongoose.model(
  "ChainMetadata",
  ChainMetadataSchema,
);

export interface Nomination {
  address: string;
  era: number;
  validators: string[];
  timestamp: number;
  bonded: number;
  blockHash: string;
}
export const NominationSchema = new Schema({
  // Nominator address
  address: String,
  // The era the nomination took place
  era: Number,
  // The validators in the nomination
  validators: [String],
  // The timestamp of the nomination
  timestamp: Number,
  // The amount of funds bonded in the account
  bonded: Number,
  // The block has the tx was finalized in
  blockHash: String,
});

export const NominationModel = mongoose.model("Nomination", NominationSchema);

export interface EraPoints {
  era: number;
  address: string;
  eraPoints: number;
}
// The individual era points a validator has earned for a given era
export const EraPointsSchema = new Schema({
  // The Era the era points are in
  era: Number,
  // The Validator stash address
  address: String,
  // The amount of era points the validator received for the given era
  eraPoints: Number,
});

EraPointsSchema.index({ address: 1 });
EraPointsSchema.index({ era: -1 });

export const EraPointsModel = mongoose.model("EraPoints", EraPointsSchema);

export interface TotalEraPoints {
  totalEraPoints: number;
  era: number;
  median: number;
  average: number;
  max: number;
  min: number;
  validatorsEraPoints: EraPoints[];
}

export const TotalEraPointsSchema = new Schema({
  // The total era points for all validators in the era
  totalEraPoints: Number,
  // The era
  era: { type: Number, index: true },
  // Median Era points,
  median: Number,
  // average era points
  average: Number,
  // The max era points in the era
  max: Number,
  // the min era points in the era
  min: Number,
  // The array of validators and their era points
  validatorsEraPoints: [EraPointsSchema],
});

export const TotalEraPointsModel = mongoose.model(
  "TotalEraPoints",
  TotalEraPointsSchema,
);

export const EraStatsSchema = new Schema({
  // When the record was created
  when: Number,
  // The era the stat is taken from
  era: { type: Number, index: true },
  // The total number of validators in the programme
  totalNodes: Number,
  // The amount of valid nodes in the programme
  valid: Number,
  // the number of nodes active in the set
  active: Number,
  //  the number of noddes that have passed kyc check
  kyc: Number,
});

export const EraStatsModel = mongoose.model("EraStatsModel", EraStatsSchema);

export interface ValidatorScoreMetadata {
  session: number;
  bondedStats: Stats;
  bondedWeight: number;
  faultsStats: Stats;
  faultWeight: number;
  inclusionStats: Stats;
  inclusionWeight: number;
  spanInclusionStats: Stats;
  spanInclusionWeight: number;
  discoveredAtStats: Stats;
  discoveredAtWeight: number;
  nominatedAtStats: Stats;
  nominatedAtWeight: number;
  offlineStats: Stats;
  offlineWeight: number;
  rankStats: Stats;
  rankWeight: number;
  locationStats: LStats;
  locationWeight: number;
  regionStats: LStats;
  regionWeight: number;
  countryStats: LStats;
  countryWeight: number;
  providerStats: LStats;
  providerWeight: number;
  councilStakeWeight?: number;
  councilStakeStats?: Stats;
  democracyStats?: Stats;
  democracyWeight?: number;
  nominatorStakeStats?: Stats;
  nominatorStakeWeight: number;
  delegationStats?: Stats;
  delegationWeight?: number;
  openGovStats?: Stats;
  openGovDelegationWeight?: number;
  openGovDelegationStats?: Stats;
  faultsWeight?: number;
  openGovWeight?: number;
  rpcWeight?: number;
  clientWeight?: number;
  updated?: number;
}

export interface ValidatorScore {
  // The last time a score was updated
  updated: number;
  // The session a score was updated at
  session: number;
  // The validator stash
  address: string;
  // total score (including randomness)
  total: number;
  // aggregate score
  aggregate: number;
  // span inclusion score
  spanInclusion: number;
  // inclusion score
  inclusion: number;
  // discovered at score
  discovered: number;
  // nominated at score
  nominated: number;
  // rank score
  rank: number;
  // unclaimed eras score
  unclaimed: number;
  // bonded score
  bonded: number;
  // faults score
  faults: number;
  // offline score
  offline: number;
  // location score
  location: number;
  // Additional location-related scores
  region: number;
  country: number;
  provider: number;
  nominatorStake: number;
  // The randomness factor used to buffer the total
  randomness: number;
  client: number;
}

export const ValidatorScoreSchema = new Schema({
  // The last time a score was updated
  updated: Number,
  // The session a score was updated at
  session: { type: Number, index: true },
  // The validator stash
  address: { type: String, index: true },
  // total score (including randomness)
  total: Number,
  // aggregate score
  aggregate: Number,
  // span inclusion score
  spanInclusion: Number,
  // inclusion score
  inclusion: Number,
  // discovered at score
  discovered: Number,
  // nominated at score
  nominated: Number,
  // rank score
  rank: Number,
  // unclaimed eras score
  unclaimed: Number,
  // bonded score
  bonded: Number,
  // faults score
  faults: Number,
  // offline score
  offline: Number,
  // location score
  location: Number,
  region: Number,
  country: Number,
  provider: Number,
  nominatorStake: Number,
  client: Number,
  // The randomness factor used to buffer the total
  randomness: Number,
});

export const ValidatorScoreModel = mongoose.model(
  "ValidatorScore",
  ValidatorScoreSchema,
);

// ValidatorScoreModel.syncIndexes().then((r) => logger.info(`indexes synced`));

export const ValidatorScoreMetadataSchema = new Schema({
  session: { type: Number, index: true },
  // Bonded Metadata
  bondedStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  bondedWeight: Number,
  // Fault Metadata
  faultsStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  faultWeight: Number,
  // Inclusion Metadata
  inclusionStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  inclusionWeight: Number,
  // Span Inclusion Metadata
  spanInclusionStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  spanInclusionWeight: Number,
  // Discovered At Metadata
  discoveredAtStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  discoveredAtWeight: Number,
  // Nominated At Metadata
  nominatedAtStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  nominatedAtWeight: Number,
  // Offline Metadata
  offlineStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  offlineWeight: Number,
  // Rank Metadata
  rankStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  rankWeight: Number,
  // Location Metadata
  locationStats: {
    values: [{ name: String, numberOfNodes: Number }],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  locationWeight: Number,
  regionStats: {
    values: [{ name: String, numberOfNodes: Number }],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  regionWeight: Number,
  countryStats: {
    values: [{ name: String, numberOfNodes: Number }],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  countryWeight: Number,
  providerStats: {
    values: [{ name: String, numberOfNodes: Number }],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  providerWeight: Number,
  councilStakeWeight: Number,
  councilStakeStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  democracyStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  democracyWeight: Number,
  nominatorStakeStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  nominatorStakeWeight: Number,
  delegationStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  delegationWeight: Number,
  openGovStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  openGovDelegationWeight: Number,
  openGovDelegationStats: {
    values: [Number],
    absoluteMin: Number,
    absoluteMax: Number,
    q10: Number,
    q25: Number,
    q50: Number,
    q75: Number,
    q90: Number,
    mean: Number,
    standardDeviation: Number,
  },
  openGovWeight: Number,
  // The last time one was updated
  updated: Number,
});

export const ValidatorScoreMetadataModel = mongoose.model(
  "ValidatorScoreMetadata",
  ValidatorScoreMetadataSchema,
);

export const ReleaseSchema = new Schema({
  name: String,
  publishedAt: Number,
});

export const ReleaseModel = mongoose.model("Release", ReleaseSchema);

export interface LocationStats {
  totalNodes: number;
  session: number;
  locations: { name: string; numberOfNodes: number }[];
  locationVariance: number;
  regions: { name: string; numberOfNodes: number }[];
  regionVariance: number;
  countries: { name: string; numberOfNodes: number }[];
  countryVariance: number;
  providers: { name: string; numberOfNodes: number }[];
  providerVariance: number;
  decentralization: number;
  updated: number;
}

// Stats on the where nodes are located.
export const LocationStatsSchema = new Schema({
  // The number of total nodes that were taken account of for this session
  totalNodes: Number,
  // Session number the record was created at
  session: { type: Number, index: true },
  // The number of nodes for each location
  locations: [
    {
      name: String,
      numberOfNodes: Number,
    },
  ],
  locationVariance: Number,
  regions: [
    {
      name: String,
      numberOfNodes: Number,
    },
  ],
  regionVariance: Number,
  countries: [
    {
      name: String,
      numberOfNodes: Number,
    },
  ],
  countryVariance: Number,
  providers: [
    {
      name: String,
      numberOfNodes: Number,
    },
  ],
  providerVariance: Number,
  decentralization: Number,
  // Timestamp of when the record was written
  updated: Number,
});

export const LocationStatsModel = mongoose.model(
  "LocationStatsModel",
  LocationStatsSchema,
);

export const IIT = new Schema({
  iit: String,
});

export const IITModel = mongoose.model("IIT", IIT);

export interface IITRequestCounter {
  requestCount: number;
  lastRequest: number;
  firstRequest: number;
}
export const IITRequestCounter = new Schema({
  requestCount: Number,
  lastRequest: Number,
  firstRequest: Number,
});

export const IITRequestCounterModel = mongoose.model(
  "IITRequestCounter",
  IITRequestCounter,
);

export const HeartbeatIndex = new Schema({
  latest: Number,
  earliest: Number,
});

export const HeartbeatIndexModel = mongoose.model(
  "HeartbeatIndex",
  HeartbeatIndex,
);

export interface Validator {
  address: string;
  keys: {
    grandpa?: string;
    babe?: string;
    imOnline?: string;
    paraValidator?: string;
    authorityDiscovery?: string;
    beefy?: string;
    paraAssignment?: string;
  };
}
export const Validator = new Schema({
  address: { type: String, index: true },
  keys: {
    grandpa: { type: String },
    babe: { type: String },
    imOnline: { type: String },
    paraValidator: { type: String },
    authorityDiscovery: { type: String },
    beefy: { type: String },
    paraAssignment: { type: String },
  },
});

export const ValidatorModel = mongoose.model("Validator", Validator);

export const BeefyStats = new Schema({
  totalValidators: Number,
  totalActiveValidators: Number,
  totalBeefyValidators: Number,
  totalActiveBeefyValidators: Number,
});

export const BeefyStatsModel = mongoose.model("BeefyStats", BeefyStats);

export const PayoutTransaction = new Schema({
  validator: { type: String, index: true },
  era: { type: Number, index: true },
  submitter: String,
  blockHash: String,
  blockNumber: Number,
  timestamp: Number,
});

export const PayoutTransactionModel = mongoose.model(
  "PayoutTransaction",
  PayoutTransaction,
);

export interface Reward {
  role: string;
  exposurePercentage: number;
  exposure: number;
  totalStake: number;
  commission: number;
  era: number;
  validator: string;
  nominator: string;
  rewardAmount: string;
  rewardDestination: string;
  erasMinStake: number;
  validatorStakeEfficiency: number;
  blockHash: string;
  blockNumber: number;
  timestamp: number;
  date: string;
  chf: number;
  usd: number;
  eur: number;
}

export const Reward = new Schema({
  role: String,
  exposurePercentage: Number,
  exposure: Number,
  totalStake: Number,
  commission: Number,
  era: { type: Number, index: true },
  validator: { type: String, index: true },
  nominator: { type: String, index: true },
  rewardAmount: Number,
  rewardDestination: String,
  erasMinStake: Number,
  validatorStakeEfficiency: Number,
  blockHash: String,
  blockNumber: Number,
  timestamp: Number,
  date: String,
  chf: Number,
  usd: Number,
  eur: Number,
});

export const RewardModel = mongoose.model("Reward", Reward);

export interface BlockIndex {
  latest: number;
  earliest: number;
}
// Storing the earliest and latest block that has been indexed
export const BlockIndex = new Schema({
  latest: Number,
  earliest: Number,
});

export const BlockIndexModel = mongoose.model("BlockIndex", BlockIndex);

export const OfflineEvent = new Schema({
  validator: { type: String, index: true },
  era: { type: Number, index: true },
  session: { type: Number, index: true },
  blockNumber: Number,
  blockHash: String,
});

export const OfflineEventModel = mongoose.model("OfflineEvent", OfflineEvent);

export const Price = new Schema({
  network: String,
  date: String,
  chf: Number,
  usd: Number,
  eur: Number,
});

export const PriceModel = mongoose.model("Price", Price);
