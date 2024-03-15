import { beforeAll, describe, expect, it } from "vitest";
import { ScoreKeeper } from "../../src";
import { getAndStartScorekeeper } from "../testUtils/scorekeeper";

const TIMEOUT_DURATION = 5200000; // 120 seconds
describe("Scorekeeper Integration Tests", () => {
  let scorekeeper: ScoreKeeper;

  beforeAll(async () => {
    scorekeeper = await getAndStartScorekeeper();
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
    "should start jobs and have their status as started",
    async () => {
      const status = scorekeeper.getJobsStatusAsJson();
      for (const key in status) {
        if (status.hasOwnProperty(key)) {
          const job = status[key];
          if (job.status !== "started") {
            console.error(`Job ${job.name} is not started.`);
          }
          expect(job.status).toBeDefined();
        }
      }
    },
    TIMEOUT_DURATION,
  );
});
