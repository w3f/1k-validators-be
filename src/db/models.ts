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
});

export const EraSchema = new Schema({
  // The last era a nomination took place
  lastNominatedEraIndex: { type: String, default: "0" },
  // The time that lastNominatedEraIndex was set
  when: Number,
});

export const NominatorSchema = new Schema({
  address: String,
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
  // The array of validators and their era points
  validatorsEraPoints: [EraPointsSchema],
});
