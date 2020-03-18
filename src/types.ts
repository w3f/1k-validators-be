export type Address = string;
export type Stash = string;

export type NominatorConfig = {
  seed: string,
  maxNominations: number,
};

export type BooleanResult = [boolean|null, string|null];
export type NumberResult = [number|null, string|null];

/// The data for a candidate that's kept in the DB.
export type CandidateData = {
  /// The ID inherited from telemetry, null when no node has been connected.
  id: number|null,
  /// The name registered on telemetry or on the candidates list.
  name: string,
  details: any[],
  connectedAt: number,
  nominatedAt: number,
  offlineSince: number,
  offlineAccumulated: number,
  rank: number,
  misbehaviors: number,
  /// This will only be null for nodes that are connected to 
  /// the telemetry and not registered as a candidate.
  stash: string|null,
};
