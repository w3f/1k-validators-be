export type Address = string;
export type Stash = string;

export type NominatorConfig = {
  seed: string;
  isProxy?: boolean;
  proxyFor?: string;
  proxyDelay?: number;
};

export type EraReward = {
  stash: string;
  era: number;
};

export type BooleanResult = [boolean, string | null];
export type NumberResult = [number, string | null];
export type StringResult = [string, string | null];

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
  verified?: boolean;
  subIdentities?: {
    name: string;
    address: string;
  }[];
  display?: string;
  email?: string;
  image?: string;
  judgements?: string[];
  legal?: string;
  // other: string;
  // parent: string;
  pgp?: string;
  riot?: string;
  twitter?: string;
  web?: string;
};

export interface Nominator {
  address: string;
  stash: string;
  proxy: string;
  bonded: number;
  now: number;
  proxyDelay: number;
  rewardDestination: string;
}

export interface TelemetryNodeDetails {
  telemetryId: number;
  name: string;
  nodeImplementation: string;
  version: string;
  ipAddress: string;
  startupTime: number;
  hardwareSpec: HardwareSpec;
  benchmarkSpec: BenchmarkSpec;
}

export interface HardwareSpec {
  cpu: string;
  memory: number | string;
  core_count: number | string;
  linux_kernel: string;
  linux_distro: string;
  is_virtual_machine: boolean;
}

export interface BenchmarkSpec {
  cpu_hashrate_score: number;
  memory_memcpy_score: number;
  disk_sequential_write_score: number;
  disk_random_write_score: number;
}

export type PayloadElement = string | number;

export type Payload = PayloadElement[][];

export interface TelemetryWsPayload extends Array<any> {
  0: any; // id
  1: Array<any>; // Array containing name, nodeImplementation, version, etc.
  2: any; // nodeStats
  3: any; // nodeIO
  4: any; // nodeHardware
  5: any; // blockDetails
  6: any; // location
  7: any; // startupTime
}

export enum NominatorState {
  Nominated = "Nominated",
  ReadyToNominate = "Ready to Nominate",
  Nominating = "Nominating",
  AwaitingProxyExecution = "Awaiting Proxy Execution",
  NotNominating = "Not Nominating",
  Stale = "Stale",
}

export interface NominatorStatus {
  state?: NominatorState;
  status?: string;
  isBonded?: boolean;
  bondedAddress?: string;
  bondedAmount?: number;
  stashAddress?: string;
  proxyAddress?: string;
  isProxy?: boolean;
  proxyDelay?: number;
  isNominating?: boolean;
  lastNominationEra?: number;
  lastNominationTime?: number;
  currentTargets?:
    | string[]
    | {
        stash?: string;
        name?: string;
        kyc?: boolean;
        score?: string | number;
      }[];
  nextTargets?: string[];
  proxyTxs?: any[];
  updated: number;
  rewardDestination?: string;
  stale?: boolean;
  dryRun?: boolean;
  shouldNominate?: boolean;
}

export enum NoLocation {
  NoLocation = "No Location",
  NoProvider = "No Provider",
}
