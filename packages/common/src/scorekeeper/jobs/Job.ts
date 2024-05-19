import logger from "../../logger";
import { jobStatusEmitter } from "../../Events";
import { JobStatus, JobEvent, JobInfo, JobRunnerMetadata } from "./types";
import { CronJob } from "cron";
import { ConfigSchema } from "../../config";

export class Job {
  private cronJob: CronJob | null = null;
  private status: JobStatus = JobStatus.Initialized;
  private name: string;
  private jobKey: string;
  jobFunction: () => Promise<any>;
  private frequency: string;
  private preventOverlap: boolean;
  private jobRunCount = 0;
  private isEnabled: boolean;
  private error: string;
  private progress: number;
  private iteration: string;
  private updated: number = Date.now();

  constructor(
    jobKey: string,
    jobFunction: (metadata: JobRunnerMetadata) => Promise<any>,
    defaultFrequency: string,
    metadata: JobRunnerMetadata,
    preventOverlap = true,
  ) {
    const config = metadata.config;
    this.jobKey = jobKey;
    this.name = this.formatJobName(jobKey);
    this.jobFunction = async () => await jobFunction(metadata);
    this.frequency = this.getFrequency(config, defaultFrequency, jobKey);
    this.isEnabled = this.checkJobEnabled(metadata.config, jobKey);
    this.preventOverlap = preventOverlap;
    this.registerEventHandlers();
  }

  public start(): void {
    if (!this.isEnabled) {
      this.log(`${this.name} is disabled`);
      return;
    }
    if (this.cronJob) {
      this.log(`${this.name} is already initialized`);
      return;
    }

    this.cronJob = new CronJob(this.frequency, this.executeJob.bind(this));
    this.cronJob.start();
    this.log(`${this.name} started with frequency: ${this.frequency}`);
  }

  public stop(): void {
    if (!this.cronJob) {
      this.log(`Can't stop ${this.name} that hasn't been started`);
      return;
    }
    this.cronJob.stop();
    this.log(`Job ${this.name} has been stopped`);
    this.setStatus(JobStatus.Finished);
  }

  public getStatusAsJson(): string {
    return JSON.stringify(this.getStatus());
  }

  public getStatus(): JobInfo {
    return {
      name: this.jobKey,
      updated: this.updated,
      enabled: this.isEnabled,
      runCount: this.jobRunCount,
      status: this.status,
      frequency: this.frequency,
      error: this.error,
      progress: this.progress,
      iteration: this.iteration,
    };
  }

  private executeJob(): void {
    if (this.preventOverlap && this.status === JobStatus.Started) {
      this.log(`${this.name} skipped execution due to overlap`);
      return;
    }
    this.setStatus(JobStatus.Started);
    this.jobFunction()
      .then(() => {
        this.setStatus(JobStatus.Finished);
      })
      .catch((error) => {
        this.error = error;
        this.setStatus(JobStatus.Failed, error);
      })
      .finally(() => {
        this.jobRunCount++;
        // TODO: this behavior is questionable. It overwrites Failed status.
        this.setStatus(JobStatus.Finished);
      });
  }

  private log(message: string) {
    logger.info(message, { label: "Job" });
  }

  private formatJobName(jobKey: string): string {
    // Ex. activeValidator => ActiveValidatorJob
    return jobKey.charAt(0).toUpperCase() + jobKey.slice(1) + "Job";
  }

  private checkJobEnabled(config: ConfigSchema, jobKey: string): boolean {
    // Enabled if the job has a defined property, ex. "activeValidatorEnabled"
    return (
      config.cron &&
      (config.cron[
        `${jobKey}Enabled` as keyof typeof config.cron
      ] as boolean) !== undefined
    );
  }

  private getFrequency(
    config: ConfigSchema,
    defaultFrequency: string,
    jobKey: string,
  ): string {
    // If there is no key in the config, use the default frequency
    return config.cron &&
      (config.cron[jobKey as keyof typeof config.cron] as string) !== undefined
      ? config.cron[jobKey as keyof typeof config.cron].toString()
      : defaultFrequency;
  }

  private registerEventHandlers() {
    jobStatusEmitter.on(JobEvent.Progress, this.updateJobHandler.bind(this));
    // TODO: check if we need these handlers at all. Maybe only for the chained jobs.
    jobStatusEmitter.on(JobEvent.Failed, this.updateJobHandler.bind(this));
    jobStatusEmitter.on(JobEvent.Finished, this.updateJobHandler.bind(this));
  }

  private updateJobHandler(info: JobInfo): void {
    if (info.name !== this.jobKey) {
      return;
    }
    if (info.error) {
      this.error = info.error;
    }
    if (info.progress !== undefined) {
      this.progress = info.progress;
    }
    if (info.iteration !== undefined) {
      this.iteration = info.iteration;
    }
    if (info.status !== undefined) {
      this.setStatus(info.status, info.error);
    }
  }

  private setStatus(status: JobStatus, error?: string): void {
    this.updated = Date.now();
    this.status = status;
    this.log(
      `${this.name} changed status to: ${this.status}${error ? " with error: " + error : ""}`,
    );
  }
}
