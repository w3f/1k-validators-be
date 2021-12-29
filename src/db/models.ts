import { Schema } from "mongoose";

const RewardRecordScheme = new Schema({
  // Era
  era: String,
  // reward for era
  reward: String,
});

export const AccountingSchema = new Schema({
  // The nominator's stash account.
  stash: String,
  // The nominator's controller account.
  controller: String,
  // Total rewards since starting the service.
  total: String,
  // More detailed reward records.
  records: [RewardRecordScheme],
});

const FaultEventSchema = new Schema({
  // Timestamp when the fault happened.
  when: Number,
  // The reason the fault took place.
  reason: String,
  // The previous rank before the deduction takes place
  prevRank: Number,
});

const RankEventSchema = new Schema({
  // Timestamp when this event happened.
  when: Number,
  // Start era for this rank event.
  startEra: Number,
  // Active era (end era) for this rank event.
  activeEra: Number,
});

export const DelayedTxSchema = new Schema({
  // The block number the transaction was announced in
  number: Number,
  // The controller address
  controller: String,
  // The validators to nominate
  targets: [String],
  callHash: String,
});

export const Identity = new Schema({
  // The Super Identity
  name: String,
  // The sub identity (if one exists)
  sub: String,
  // Whether or not the identity has been verified by a registrar
  verified: Boolean,
});

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
    ],
    default: "NEW",
  },
  details: {},
  updated: Number,
});

export const CandidateSchema = new Schema({
  // The inherited telemetry ID.
  telemetryId: Number,
  // The network identifier derived from the networking key.
  networkId: String,
  // The number of nodes that are online for this candidate (this handles upgrade situations).
  nodeRefs: Number,
  // The name registered on the candidates list.
  name: String,
  // The inherited telemetry details.
  telemetryDetails: [],
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
  // The timestamp for the most recent time the node has come online.
  onlineSince: { type: Number, default: 0 },
  // Whether it is running the latest client code.
  updated: { type: Boolean, default: false },
  // The number of nomination rounds the node has done well.
  rank: { type: Number, default: 0 },
  // The number of times that the node has been found to have done something
  // wrong during a nomination round.
  faults: { type: Number, default: 0 },
  // The stash account of the candidate. May be empty if no stash is registered.
  stash: String,
  // The controller of the candidates
  controller: String,
  // The reasons a candidate is not meeting the programme requirements.
  invalidityReasons: { type: String, default: "" },
  // If a validator has faults, this will contain the details.
  faultEvents: { type: [FaultEventSchema], default: [] },
  // If a validator had its rank increased, this will contian details.
  rankEvents: { type: [RankEventSchema], default: [] },
  // Unclaimed Era Rewards
  unclaimedEras: { type: [Number], default: [] },
  // Polkadot specific: Kusama Stash
  kusamaStash: String,
  // Polkadot specific: Case for good intentions
  bio: String,
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
  // The node location according to telemetry
  location: String,
  // The amount of stake going towards backing council members
  councilStake: { type: String, default: 0 },
  // Who the candidate is backing as a council member (an array of council addresses)
  councilVotes: [String],
});

export const EraSchema = new Schema({
  // The last era a nomination took place
  lastNominatedEraIndex: { type: String, default: "0" },
  // ~ 24 hours from the last time a nomination occured.
  nextNomination: Number,
  // The time that lastNominatedEraIndex was set
  when: Number,
});

export const NominatorSchema = new Schema({
  // The controller address
  address: String,
  // The Stash address
  stash: String,
  // The nominator proxy account
  proxy: String,
  // The amount bonded
  bonded: Number,
  current: [],
  lastNomination: { type: Number, default: 0 },
  createdAt: { type: Number, default: 0 },
});

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

export const ChainMetadataSchema = new Schema({
  // Number of decimals
  decimals: Number,
  // Chain name
  name: String,
});

// A historical event when the bot will claim a reward on behalf of a nominator
export const BotClaimEventSchema = new Schema({
  // Validator Address
  address: String,
  // The era the reward was claimed for
  era: Number,
  // The timestamp the event occured
  timestamp: Number,
  // The finalized blockhash of the Claim tx
  blockHash: String,
});

// The individual era points a validator has earned for a given era
export const EraPointsSchema = new Schema({
  // The Era the era points are in
  era: Number,
  // The Validator stash address
  address: String,
  // The amount of era points the validator received for the given era
  eraPoints: Number,
});

export const TotalEraPointsSchema = new Schema({
  // The total era points for all validators in the era
  totalEraPoints: Number,
  // The era
  era: Number,
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

export const EraStatsSchema = new Schema({
  // When the record was created
  when: Number,
  // The era the stat is taken from
  era: Number,
  // The total number of validators in the programme
  totalNodes: Number,
  // The amount of valid nodes in the programme
  valid: Number,
  // the number of nodes active in the set
  active: Number,
});

export const ValidatorScoreSchema = new Schema({
  // The last time a score was updated
  updated: Number,
  // The validator stash
  address: String,
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
  // council backing score
  councilStake: Number,
  // The randomness factor used to buffer the total
  randomness: Number,
});

export const ValidatorScoreMetadataSchema = new Schema({
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
  // Unclaimed Metadata
  unclaimedStats: {
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
  unclaimedWeight: Number,
  // Location Metadata
  locationStats: {
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
  locationWeight: Number,
  // The last time one was updated
  updated: Number,
});

export const ReleaseSchema = new Schema({
  name: String,
  publishedAt: Number,
});

// Stats on the where nodes are located.
export const LocationStatsSchema = new Schema({
  // Session number the record was created at
  session: Number,
  // The number of nodes for each location
  locations: [
    {
      name: String,
      numberOfNodes: Number,
    },
  ],
  // Timestamp of when the record was written
  updated: Number,
});

// A council member
export const CouncillorSchema = new Schema({
  // The councillors address
  address: String,
  // Membership status
  status: {
    type: String,
    enum: ["Candidate", "Member", "Runner Up"],
    default: "None",
  },
  // The total backing
  backing: Number,
  // the last time the record was updated
  updated: Number,
});

export const ElectionStatsSchema = new Schema({
  // The duration of the term
  termDuration: Number,
  // The min amount of bond for a candidate
  candidacyBond: Number,
  // The amount of active council members
  totalMembers: Number,
  // The amount of candidates that are not active
  totalRunnersUp: Number,
  // the total amount of candidates
  totalCandidates: Number,
  // The total amount of addresses that vote for council members
  totalVoters: Number,
  // The sum total of tokens (in human readable denomination) bonded for all voters for elections
  totalBonded: Number,
  // the timestamp the record was last updated
  updated: Number,
  // the epoch the record was queried in
  session: Number,
});

// Era payout events that happen at the end of every era
export const EraPaidEventSchema = new Schema({
  // The era index
  era: Number,
  // the block number the era payout event was included in
  blockNumber: Number,
  // The timestamp of the block the era payout was included in
  blockTimestamp: Number,
  // The event index in the block it was included in
  eventIndex: String,
  // The pallet of the event
  moduleId: String,
  // The event type of the pallet
  eventId: String,
  // The total amount split between all validators that era
  totalValidatorReward: Number,
  // The total amount that goes to the treasury
  totalRemainderReward: Number,
  // when the record was updated
  updated: Number,
});

export const EraReward = new Schema({
  era: Number,
  stash: String,
  rewardDestination: String,
  validatorStash: String,
  amount: Number,
  blockTimestamp: Number,
  blockNumber: Number,
  slashKTon: Number,
  claimTimestampDelta: Number,
  claimBlockDelta: Number,
});
