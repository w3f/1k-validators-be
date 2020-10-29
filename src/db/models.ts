import { Schema } from "mongoose";

const RewardRecordScheme = new Schema({
  // Era
  era: String,
  // reward for era
  reward: String,
});

const AccountingSchema = new Schema({
  // The nominator's stash account.
  stash: String,
  // The nominator's controller account.
  controller: String,
  // Total rewards since starting the service.
  total: String,
  // More detailed reward records.
  records: [RewardRecordScheme],
});

const CandidateSchema = new Schema({
  // The inherited telemetry ID.
  telemetryId: Number,
  // The network identifier derived from the networking key.
  networkId: String,
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
  // The network identifier for the sentry node attached to this node.
  sentryId: [],
  // Timestamp for when the sentry was found online (zero if currently offline).
  sentryOnlineSince: { type: Number, default: 0 },
  // Timestamp for when the sentry was found offline (zero if currently online).
  sentryOfflineSince: { type: Number, default: 0 },
});

const EraSchema = new Schema({
  lastNominatedEraIndex: { type: String, default: "0" },
});

const NominatorSchema = new Schema({
  address: String,
  current: [],
  lastNomination: { type: Number, default: 0 },
  createdAt: { type: Number, default: 0 },
});

export { CandidateSchema, EraSchema, NominatorSchema };
