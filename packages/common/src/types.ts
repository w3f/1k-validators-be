export type Address = string;
export type Stash = string;

export type NominatorConfig = {
  seed: string;
  maxNominations: number | "auto";
  isProxy?: boolean;
  proxyFor?: string;
  proxyDelay?: number;
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
  address: string;
  verified: boolean;
  subIdentities: {
    name: string;
    address: string;
  }[];
  display: string;
  email: string;
  image: string;
  judgements: string[];
  legal: string;
  // other: string;
  // parent: string;
  pgp: string;
  riot: string;
  twitter: string;
  web: string;
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
  commission: number;
  active: boolean;
  unclaimedEras: [number];
  version: string;
  valid: boolean;
  bonded: number;
  faults: number;
  inclusion: number;
  spanInclusion: number;
  identity: Identity;
  location: string;
  councilStake: number;
  councilVotes: any[];
  democracyVoteCount: number;
  democracyVotes: [number];
  convictionVotes: [number];
  convictionVoteCount: number;
  infrastructureLocation: any;
};

// LEGACY GOV
export type Referendum = {
  // The unique index of the proposal, used to identity and query by
  referendumIndex: number;
  // The block at which the proposal was made
  proposedAt: number;
  // The block at which voting on the proposal ends
  proposalEnd: number;
  // the number of blocks delay between the proposal voting ending and it enacting if passed
  proposalDelay: number;
  // The kind of turnout needed, ie 'SimplyMajority', or 'SuperMajorityApprove'
  threshold: string;
  // The human denoninated deposit for the proposal
  deposit: number;
  // The address of who proposed it
  proposer: string;
  // the hash of the call
  imageHash: string;
  // The total amount of votes
  voteCount: number;
  // The total amount of votes for Aye
  voteCountAye: number;
  // The total amount of nay votes
  voteCountNay: number;
  // The amount of human denominated tokens that voted Aye
  voteAyeAmount: number;
  // The amount of human denominated tokens that voted Nay
  voteNayAmount: number;
  // The amount of human denominated tokens that voted in total
  voteTotalAmount: number;
  // Whether the vote is passing or not
  isPassing: boolean;
};

// LEGACY GOV
export type ReferendumVote = {
  // The unique index of the proposal, used to identity and query by
  referendumIndex: number;
  // The account the vote is from
  accountId: string;
  // Whether or not the vote was delegated
  isDelegating: boolean;
  // the human denominated amount of tokens voting
  balance: number;
  // The kind of vote, ie 'Aye' or 'Nay'
  voteDirection: string;
  // The conviction that was used to vote with
  conviction: string;
};

export type ConvictionVote = {
  // The particular governance track
  track: number;
  // The account that is voting
  address: string;
  // The index of the referendum
  referendumIndex: number;
  // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
  conviction: string;
  // The balance they are voting with themselves, sans delegated balance
  balance: number;
  // The total amount of tokens that were delegated to them (including conviction)
  delegatedConvictionBalance: number;
  // the total amount of tokens that were delegated to them (without conviction)
  delegatedBalance: number;
  // The vote type, either 'aye', or 'nay'
  voteDirection: string;
  // Whether the person is voting themselves or delegating
  voteType: string;
  // Who the person is delegating to
  delegatedTo: string;
};

export type ConvictionDelegation = {
  track: number;
  address: string;
  target: string;
  balance: number;
  conviction: string;
  // The total amount of tokens that were delegated to them (including conviction)
  delegatedConvictionBalance: number;
  // the total amount of tokens that were delegated to them (without conviction)
  delegatedBalance: number;
  prior: any;
};

// The constant data of an OpenGov Track
export type TrackInfo = {
  trackIndex: string;
  name: string;
  maxDeciding: number;
  decisionDeposit: number;
  preparePeriod: number;
  decisionPeriod: number;
  confirmPeriod: number;
  minEnactmentPeriod: number;
};

export type OpenGovReferendum = {
  index: number;
  track: number;
  origin: string;
  proposalHash: string;
  enactmentAfter: number;
  submitted: number;
  submissionWho: string | null;
  submissionAmount: number | null;
  decisionDepositWho: string | null;
  decisionDepositAmount: number | null;
  decidingSince: number | null;
  decidingConfirming: boolean | null;
  ayes: number;
  nays: number;
  support: number;
  inQueue: boolean;
  currentStatus: string;
  //alarm
};

export interface AvailabilityCoreState {
  blockNumber: number;
  core: number;
  paraId: number;
  kind: string;
  groupIdx: number;
  validators: string[];
}

export interface AvailabilityBitfield {
  blockNumber: number;
  validator: string;
  session: number;
  valIdx: number;
  bitfield: string;
  candidateChunkCount: number;
  availableCandidates: number[];
  signature?: string;
}
