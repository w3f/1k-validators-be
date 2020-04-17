import { Schema } from "mongoose";

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
  discoveredAt: Number,
  // The last timestamp the node was nominated (if ever).
  nominatedAt: Number,
  // The timestamp for when the node went offline (if ever).
  offlineSince: Number,
  // The cumulative duration of offline time (in ms).
  offlineAccumulated: Number,
  // The timestamp for the most recent time the node has come online.
  onlineSince: Number,
  // Whether it is running the latest client code.
  updated: Boolean,
  // The number of nomination rounds the node has done well.
  rank: Number,
  // The number of times that the node has been found to have done something
  // wrong during a nomination round.
  faults: Number,
  // The stash account of the candidate. May be empty if no stash is registered.
  stash: String,
  // The network identifier for the sentry node attached to this node.
  sentryId: String,
  // Timestamp for when the sentry was found online (zero if currently offline).
  sentryOnlineSince: Number,
  // Timestamp for when the sentry was found offline (zero if currently online).
  sentryOfflineSince: Number,
});

const NominatorSchema = new Schema({
  address: String,
  current: [],
  lastNomination: Number,
  createdAt: Number,
});

export { CandidateSchema, NominatorSchema };
