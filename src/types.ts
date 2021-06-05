export type Address = string;
export type Stash = string;

export type NominatorConfig = {
  seed: string;
  maxNominations: number | "auto";
  isProxy?: boolean;
  proxyFor?: string;
};

export type ClaimerConfig = {
  seed: string;
};

export type EraReward = {
  stash: string;
  era: number;
};

export type BooleanResult = [boolean | null, string | null];
export type NumberResult = [number | null, string | null];
export type StringResult = [string | null, string | null];

export enum InvalidityType {
  Online,
  ValidateIntention,
  ClientUpgrade,
  ConnectionTime,
  Identity,
  MultipleIdentities,
  AccumulatedOfflineTime,
  RewardDestination,
  Commission,
  SelfStake,
  UnclaimedRewards,
  KusamaRank,
}

export type InvalidityReason = {
  valid: boolean;
  type: InvalidityType;
  details: string;
  updated: number;
};

export type Identity = {
  name: string;
  sub: string;
  verified: boolean;
};

/// The data for a candidate that's kept in the DB.
export type CandidateData = {
  /// The ID inherited from telemetry, null when no node has been connected.
  /// Cannot be used reliably to identify specific nodes. Instead use the networkId
  /// field.
  id: number | null;
  /// The network id is null when no node is connected.
  networkId: string | null;
  /// The name registered on telemetry or on the candidates list.
  name: string;
  details: any[];
  discoveredAt: number;
  nominatedAt: number;
  offlineSince: number;
  offlineAccumulated: number;
  // Records when a node came online.
  onlineSince: number;
  // Records if a node is running the latest code.
  updated: boolean;
  rank: number;
  misbehaviors: number;
  /// This will only be null for nodes that are connected to
  /// the telemetry and not registered as a candidate.
  stash: string | null;
  kusamaStash: string;
  skipSelfStake: boolean;
  bio: string;
  unclaimedEras: [number];
  version: string;
  valid: boolean;
  bonded: number;
  faults: number;
  inclusion: number;
  spanInclusion: number;
  identity: Identity;
};
