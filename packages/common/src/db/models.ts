import { Schema } from "mongoose";
import mongoose from "mongoose";
import { logger } from "../index";

const RewardRecordScheme = new Schema({
  // Era
  era: { type: String, index: true },
  // reward for era
  reward: String,
});

export const AccountingSchema = new Schema({
  // The nominator's stash account.
  stash: { type: String, index: true },
  // The nominator's controller account.
  controller: String,
  // Total rewards since starting the service.
  total: String,
  // More detailed reward records.
  records: [RewardRecordScheme],
});

export const AccountingModel = mongoose.model("Accounting", AccountingSchema);

const FaultEventSchema = new Schema({
  // Timestamp when the fault happened.
  when: { type: Number, index: true },
  // The reason the fault took place.
  reason: String,
  // The previous rank before the deduction takes place
  prevRank: Number,
});

const RankEventSchema = new Schema({
  // Timestamp when this event happened.
  when: { type: Number, index: true },
  // Start era for this rank event.
  startEra: Number,
  // Active era (end era) for this rank event.
  activeEra: Number,
});

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

export const Identity = new Schema({
  name: { type: String, index: true },
  address: String,
  verified: Boolean,
  subIdentities: [
    {
      name: String,
      address: String,
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
  LatestSessionSchema
);

export const LatestValidatorSetSchema = new Schema({
  session: Number,
  era: Number,
  validators: [String],
});

export const LatestValidatorSetModel = mongoose.model(
  "LatestValidatorSet",
  LatestValidatorSetSchema
);

export const LocationSchema = new Schema({
  name: String, // The Telemetry name of the node
  address: String, // The Validator Address
  addr: String,
  port: Number,
  city: String,
  region: String,
  country: String,
  provider: String,
  updated: Number,
  session: Number,
  source: String,
});

export const LocationModel = mongoose.model("Location", LocationSchema);

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

// NominatorStakeSchema.index({ validator: 1, era: -1 });
// NominatorStakeSchema.index({ era: -1 });

export const NominatorStakeModel = mongoose.model(
  "NominatorStake",
  NominatorStakeSchema
);

export const DelegationSchema = new Schema({
  validator: String,
  totalBalance: Number,
  delegators: [
    {
      address: String,
      balance: Number,
      effectiveBalance: Number,
      conviction: String,
    },
  ],
  updated: Number,
});
export const DelegationModel = mongoose.model("Delegation", DelegationSchema);

export const OpenGovDelegationSchema = new Schema({
  validator: String,
  totalBalance: Number,
  delegators: [
    {
      address: String,
      balance: Number,
      effectiveBalance: Number,
      conviction: String,
    },
  ],
  updated: Number,
});

export const OpenGovDelegationModel = mongoose.model(
  "OpenGovDelegation",
  OpenGovDelegationSchema
);

export const CandidateSchema = new Schema({
  // The inherited telemetry ID.
  telemetryId: Number,
  // The network identifier derived from the networking key.
  networkId: String,
  // The number of nodes that are online for this candidate (this handles upgrade situations).
  nodeRefs: Number,
  // The name registered on the candidates list.
  name: { type: String, index: true },
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
  stash: { type: String, index: true },
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
  totalRewards: Number,
  avgClaimTimestampDelta: Number,
  avgClaimBlockDelta: Number,
  // The number of referenda voted on
  democracyVoteCount: { type: Number, default: 0 },
  // The referenda indexes voted on
  democracyVotes: [Number],
  convictionVotes: [Number],
  convictionVoteCount: { type: Number, default: 0 },
  infrastructureLocation: LocationSchema,
  matrix: [String],
});

export const CandidateModel = mongoose.model("Candidate", CandidateSchema);

export const EraSchema = new Schema({
  // The last era a nomination took place
  lastNominatedEraIndex: { type: String, default: "0" },
  // ~ 24 hours from the last time a nomination occured.
  nextNomination: Number,
  // The time that lastNominatedEraIndex was set
  when: Number,
});

export const EraModel = mongoose.model("Era", EraSchema);

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

export const ChainMetadataModel = mongoose.model(
  "ChainMetadata",
  ChainMetadataSchema
);

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

export const BotClaimEventModel = mongoose.model(
  "BotClaimEvent",
  BotClaimEventSchema
);

export const NominationModel = mongoose.model("Nomination", NominationSchema);

// The individual era points a validator has earned for a given era
export const EraPointsSchema = new Schema({
  // The Era the era points are in
  era: Number,
  // The Validator stash address
  address: String,
  // The amount of era points the validator received for the given era
  eraPoints: Number,
});

// EraPointsSchema.index({ address: 1 });
// EraPointsSchema.index({ era: -1 });

export const EraPointsModel = mongoose.model("EraPoints", EraPointsSchema);

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
  TotalEraPointsSchema
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
});

export const EraStatsModel = mongoose.model("EraStatsModel", EraStatsSchema);

export const ValidatorScoreSchema = new Schema({
  // The last time a score was updated
  updated: Number,
  // The session a score was updated at
  session: Number,
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
  // council backing score
  councilStake: Number,
  // democracy score
  democracy: Number,
  nominatorStake: Number,
  delegations: Number,
  openGov: Number,
  // The randomness factor used to buffer the total
  randomness: Number,
});

export const ValidatorScoreModel = mongoose.model(
  "ValidatorScore",
  ValidatorScoreSchema
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
  openGovWeight: Number,
  // The last time one was updated
  updated: Number,
});

export const ValidatorScoreMetadataModel = mongoose.model(
  "ValidatorScoreMetadata",
  ValidatorScoreMetadataSchema
);

export const ReleaseSchema = new Schema({
  name: String,
  publishedAt: Number,
});

export const ReleaseModel = mongoose.model("Release", ReleaseSchema);

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
  LocationStatsSchema
);

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

export const CouncillorModel = mongoose.model("Councillor", CouncillorSchema);

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

export const ElectionStatsModel = mongoose.model(
  "ElectionStats",
  ElectionStatsSchema
);

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

export const EraPaidEventModel = mongoose.model("EraPaid", EraPaidEventSchema);

export const EraRewardSchema = new Schema({
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
  updated: Number,
});

export const EraRewardModel = mongoose.model("EraReward", EraRewardSchema);

// Information about a democracy referendum
export const ReferendumSchema = new Schema({
  // The unique index of the proposal, used to identity and query by
  referendumIndex: Number,
  // The block at which the proposal was made
  proposedAt: Number,
  // The block at which voting on the proposal ends
  proposalEnd: Number,
  // the number of blocks delay between the proposal voting ending and it enacting if passed
  proposalDelay: Number,
  // The kind of turnout needed, ie 'SimplyMajority', or 'SuperMajorityApprove'
  threshold: String,
  // The human denoninated deposit for the proposal
  deposit: Number,
  // The address of who proposed it
  proposer: String,
  // the hash of the call
  imageHash: String,
  // The total amount of votes
  voteCount: Number,
  // The total amount of votes for Aye
  voteCountAye: Number,
  // The total amount of nay votes
  voteCountNay: Number,
  // The amount of human denominated tokens that voted Aye
  voteAyeAmount: Number,
  // The amount of human denominated tokens that voted Nay
  voteNayAmount: Number,
  // The amount of human denominated tokens that voted in total
  voteTotalAmount: Number,
  // Whether the vote is passing or not
  isPassing: Boolean,
  // The last timestamp the record was updated at
  updatedTimestamp: Number,
  // The last block number the record was updated at
  updatedBlockNumber: Number,
  // last block hash the record was updated at
  updatedBlockHash: Number,
});

export const ReferendumModel = mongoose.model("Referendum", ReferendumSchema);

// Information about a particular vote in a democracy referendum
export const ReferendumVoteSchema = new Schema({
  // The unique index of the proposal, used to identity and query by
  referendumIndex: { type: Number, index: true },
  // The account the vote is from
  accountId: { type: String, index: true },
  // Whether or not the vote was delegated
  isDelegating: Boolean,
  // the human denominated amount of tokens voting
  balance: Number,
  // The kind of vote, ie 'Aye' or 'Nay'
  voteDirection: String,
  // The conviction that was used to vote with
  conviction: String,
  // The last timestamp the record was updated at
  updatedTimestamp: Number,
  // The last block number the record was updated at
  updatedBlockNumber: Number,
  // last block hash the record was updated at
  updatedBlockHash: String,
});

// ReferendumVoteSchema.index({ accountId: 1 });
// ReferendumVoteSchema.index({ referendumIndex: -1 });

export const ReferendumVoteModel = mongoose.model(
  "ReferendumVote",
  ReferendumVoteSchema
);

export const ConvictionVote = new Schema({
  // The particular governance track
  track: Number,
  // The account that is voting
  address: String,
  // The index of the referendum
  referendumIndex: Number,
  // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
  conviction: String,
  // The balance they are voting with themselves, sans delegated balance
  balance: Number,
  // The total amount of tokens that were delegated to them (including conviction)
  delegatedConvictionBalance: Number,
  // the total amount of tokens that were delegated to them (without conviction)
  delegatedBalance: Number,
  // The vote type, either 'aye', or 'nay'
  voteDirection: String,
  // Whether the person is voting themselves or delegating
  voteType: String,
  // Who the person is delegating to
  delegatedTo: String,
  // The block number the vote was updated at
  updatedBlockNumber: Number,
});

export const ConvictionVoteModel = mongoose.model(
  "ConvictionVote",
  ConvictionVote
);

export const OpenGovReferendum = new Schema({
  index: Number,
  track: Number,
  origin: String,
  proposalHash: String,
  enactmentAfter: Number,
  submitted: Number,
  submissionWho: String,
  submissionAmount: Number,
  decisionDepositWho: String,
  decisionDepositAmount: Number,
  decidingSince: Number,
  decidingConfirming: Boolean,
  ayes: Number,
  nays: Number,
  support: Number,
  inQueue: Boolean,
  updatedBlockNumber: Number,
  updatedBlockHash: String,
  updatedTimestamp: Number,
});

export const OpenGovReferendumModel = mongoose.model(
  "OpenGovReferendum",
  OpenGovReferendum
);

export const IIT = new Schema({
  iit: String,
});

export const IITModel = mongoose.model("IIT", IIT);

export const EraInfo = new Schema({
  index: Number,
  startBlock: Number,
  endBlock: Number,
});

export const EraInfoModel = mongoose.model("EraInfo", EraInfo);

export const Session = new Schema({
  index: Number,
  startBlock: Number,
  endBlock: Number,
});

export const SessionModel = mongoose.model("Session", Session);
