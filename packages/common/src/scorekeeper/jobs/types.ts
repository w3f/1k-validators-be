import { ApiHandler, ChainData, Config, Constraints } from "../../index";
import MatrixBot from "../../matrix";
import Nominator from "../../nominator/nominator";

// Job keys used in the config
export enum JobKey {
  ActiveValidator = "activeValidator",
  Monitor = "monitor",
  ClearOffline = "clearOffline",
  Validity = "validity",
  Score = "score",
  EraStats = "eraStats",
  EraPoints = "eraPoints",
  Inclusion = "inclusion",
  SessionKey = "sessionKey",
  UnclaimedEras = "unclaimedEras",
  ValidatorPref = "validatorPref",
  LocationStats = "locationStats",
  Nominator = "nominator",
  BlockData = "block",
  MainScorekeeper = "scorekeeper",
  Execution = "execution",
  Cancel = "cancel",
  StaleNomination = "stale",
}

export type JobRunnerMetadata = {
  config: Config.ConfigSchema;
  chaindata: ChainData;
  nominatorGroups: Nominator[];
  nominating: boolean;
  bot: MatrixBot;
  constraints: Constraints.OTV;
  handler: ApiHandler;
  currentTargets: { stash?: string; identity?: any }[];
};

export type JobConfig = {
  jobKey: JobKey;
  defaultFrequency: string;
  jobFunction: (metadata: JobRunnerMetadata) => Promise<any>;
  preventOverlap?: boolean;
};

export enum JobStatus {
  Initialized = "Initialized",
  Started = "Started",
  Running = "Running", // This status is not used and seems redundant
  Finished = "Finished",
  Failed = "Failed",
}

export enum JobEvent {
  Started = "Started",
  Running = "Running",
  Finished = "Finished",
  Failed = "Failed",
  Progress = "Progress",
}

// Used to expose Job info to the Gateway
export type JobInfo = {
  name: string;
  updated?: number;
  enabled?: boolean;
  runCount?: number;
  status: JobStatus;
  frequency?: string;
  error?: string;
  // Progress from 0 to 100
  progress?: number;
  // Name of the current iteration
  iteration?: string;
};
