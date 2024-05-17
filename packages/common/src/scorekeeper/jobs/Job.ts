import { startJob } from "./cron/StartCronJobs";
import logger from "../../logger";
import { jobStatusEmitter } from "../../Events";
import { JobStatus, JobConfig, JobRunnerMetadata } from "./types";

export class Job {
  protected status: JobStatus;
  protected jobConfig: JobConfig;
  protected jobRunnerMetadata: JobRunnerMetadata;

  // TODO: remove this dependency injection during the next refactoring phases
  private startJobFunction: (
    metadata: JobRunnerMetadata,
    jobConfig: JobConfig,
  ) => Promise<void>;

  static events: string[] = [
    "jobStarted",
    "jobRunning",
    "jobFinished",
    "jobErrored",
    "jobProgress",
  ];

  // TODO: startJob as parameter
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    this.status = {
      name: jobConfig.name,
      updated: Date.now(),
      status: "Not Running",
    };
    this.jobConfig = jobConfig;
    this.jobRunnerMetadata = jobRunnerMetadata;
    this.startJobFunction = startJob;
  }

  private log(message: string) {
    logger.info(message, { label: "Job" });
  }

  // TODO: remove events and use db to handle the state
  // then we can decouple scorekeeper and gateway
  private registerEventHandlers() {
    this.log(`Registering event handlers for ${this.jobConfig.name}`);
    Job.events.forEach((event) => {
      jobStatusEmitter.on(event, (data: JobStatus) => {
        this.updateJobStatus(data);
      });
    });
  }

  public async run(): Promise<void> {
    this.registerEventHandlers();
    this.log(`Starting ${this.getName()}`);
    await this.startJobFunction(this.jobRunnerMetadata, this.jobConfig);
  }

  public getName(): string {
    return this.jobConfig.name;
  }

  public updateJobStatus(status: JobStatus) {
    if (status.name == this.getName()) {
      this.status = { ...this.status, ...status };
    }
  }

  public getStatusAsJson(): string {
    return JSON.stringify(this.status);
  }

  public getStatus(): JobStatus {
    return this.status;
  }
}
