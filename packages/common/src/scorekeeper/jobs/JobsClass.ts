import { ApiHandler, ChainData, Config, Constraints } from "../../index";
import MatrixBot from "../../matrix";
import Nominator from "../../nominator/nominator";
import { ConfigSchema } from "../../config";
import { startJob } from "./cron/StartCronJobs";
import logger from "../../logger";
import { registerJobStatusEventEmitterHandler } from "../RegisterHandler";

export const jobsLabel = { label: "Jobs" };

export type JobRunnerMetadata = {
  config: Config.ConfigSchema;
  chaindata: ChainData;
  nominatorGroups: Nominator[];
  nominating: boolean;
  // currentEra: number;
  bot: MatrixBot;
  constraints: Constraints.OTV;
  handler: ApiHandler;
  currentTargets: { stash?: string; identity?: any }[];
};

export type JobConfig = {
  jobKey: keyof ConfigSchema["cron"] | "";
  defaultFrequency: string;
  jobFunction: (metadata: JobRunnerMetadata) => Promise<void>;
  name: string;
  preventOverlap?: boolean;
};

export interface JobStatus {
  name: string;
  updated: number;
  enabled?: boolean;
  runCount?: number;
  status: string;
  frequency?: string;
  error?: string;
  progress?: number; // Progress from 0 to 100
  iteration?: string; // Name of the current iteration
}

export abstract class Job {
  protected _status: JobStatus;
  protected _jobConfig: JobConfig;
  protected _jobRunnerMetadata: JobRunnerMetadata;

  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    this._status = {
      name: jobConfig.name,
      updated: Date.now(),
      status: "Not Running",
    };
    this._jobConfig = jobConfig;
    this._jobRunnerMetadata = jobRunnerMetadata;
  }

  public setupAndStartJob = async (): Promise<void> => {
    logger.info(
      `Registering Event Emitter for ${this._jobConfig.name}`,
      jobsLabel,
    );
    registerJobStatusEventEmitterHandler(this);
    logger.info(`Starting ${this._jobConfig.name}`, jobsLabel);
    await startJob(this._jobRunnerMetadata, this._jobConfig);
  };

  public getName = (): string => {
    return this._jobConfig.name;
  };

  public updateJobStatus(status: JobStatus) {
    if (status.name == this._jobConfig.name) {
      this._status = { ...this._status, ...status };
    }
  }

  public getStatusAsJson(): string {
    return JSON.stringify(this._status);
  }
  public getStatus = (): JobStatus => {
    return this._status;
  };
}
