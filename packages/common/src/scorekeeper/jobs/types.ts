import { ConfigSchema } from "../../config";
import { ApiHandler, ChainData, Config, Constraints } from "../../index";
import MatrixBot from "../../matrix";
import Nominator from "../../nominator/nominator";

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
  jobKey: keyof Config.ConfigSchema["cron"] | "";
  defaultFrequency: string;
  jobFunction: (metadata: JobRunnerMetadata) => Promise<any>;
  name: string;
  preventOverlap?: boolean;
};

// JobDefinition abstraction is an intermediate stage of refactoring
// TODO: JobDefinition => JobConfig
export type JobDefinition = {
  jobKey: keyof ConfigSchema["cron"] | "";
  defaultFrequency: string;
  jobFunction: (metadata: JobRunnerMetadata) => Promise<any>;
};

type StatusName =
  | "running"
  | "finished"
  | "errored"
  | "started"
  | "Not Running";

export type JobStatus = {
  name: string;
  updated: number;
  enabled?: boolean;
  runCount?: number;
  status: StatusName;
  frequency?: string;
  error?: string;
  // Progress from 0 to 100
  progress?: number;
  // Name of the current iteration
  iteration?: string;
};
