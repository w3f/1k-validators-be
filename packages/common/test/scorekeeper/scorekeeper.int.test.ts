import { beforeAll, describe, expect, it } from "vitest";
import { ScoreKeeper } from "../../src";
import { getAndStartScorekeeper } from "../testUtils/scorekeeper";
import { jobStatusEmitter } from "../../src/Events";
import { JobEvent, JobStatus } from "../../src/scorekeeper/jobs/types";
import { getKusamaProdConfig } from "../testUtils/config";

const TIMEOUT_DURATION = 5200000; // 120 seconds
describe("Scorekeeper Integration Tests", () => {
  let scorekeeper: ScoreKeeper;

  beforeAll(async () => {
    const config = getKusamaProdConfig();

    // The first job "activeValidator" running every 5 seconds
    config.cron.activeValidator = "*/5 * * * * *";

    scorekeeper = await getAndStartScorekeeper(config);
  }, TIMEOUT_DURATION);

  it(
    "should start, add nominators, and have their status as awaiting nominations",
    async () => {
      const status = scorekeeper.getAllNominatorStatus();
      for (const s of status) {
        expect(s.status).toBeDefined();
      }
    },
    TIMEOUT_DURATION,
  );

  it(
    "should start jobs and have their status as initialized",
    async () => {
      const statusJson = scorekeeper.getJobsStatusAsJson();
      const statuses = Object.values(statusJson);
      statuses.forEach((job) => {
        if (job.status !== JobStatus.Initialized) {
          console.error(`Job ${job.name} is not initialized.`);
        }
        expect(job.status).toBeDefined();
      });
    },
    TIMEOUT_DURATION,
  );

  it(
    "should wait till the activeValidator job will be finished",
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusJson = scorekeeper.getJobsStatusAsJson();
      const statuses = Object.values(statusJson);
      expect(statuses[0].status).toBe(JobStatus.Finished);
    },
    TIMEOUT_DURATION,
  );

  it(
    "should update status of the job on event",
    async () => {
      const statusesBefore = scorekeeper.getJobsStatusAsJson();
      const firstJob = Object.values(statusesBefore)[0];
      const secondJob = Object.values(statusesBefore)[1];

      jobStatusEmitter.emit(JobEvent.Finished, {
        name: firstJob.name,
        status: JobStatus.Finished,
      });

      const statusesAfter = scorekeeper.getJobsStatusAsJson();
      const updatedFirstJob = Object.values(statusesAfter)[0];
      const unchangedSecondJob = Object.values(statusesAfter)[1];

      // Check that the first job's status has been updated
      expect(updatedFirstJob.status).toBe(JobStatus.Finished);
      // Check that the second job's status remains unchanged
      expect(unchangedSecondJob.status).toBe(secondJob.status);
    },
    TIMEOUT_DURATION,
  );
});
