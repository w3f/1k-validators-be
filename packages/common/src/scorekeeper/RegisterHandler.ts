/**
 * Functions for registering events from the ApiHandler
 *
 * @function RegisterHandler
 */
import {
  ApiHandler,
  ChainData,
  Config,
  logger,
  queries,
  ScoreKeeper,
} from "../index";
import { dockPoints } from "./Rank";
import { scorekeeperLabel } from "./scorekeeper";
import { jobStatusEmitter } from "../Events";
import { Job, JobStatus } from "./jobs/JobsClass";

export const registerAPIHandler = (
  handler: ApiHandler,
  config: Config.ConfigSchema,
  chaindata: ChainData,
  bot: any,
): void => {
  // Handles offline event. Validators will be faulted for each session they are offline
  //     If they have already reaceived an offline fault for that session, it is skipped
  handler.on("someOffline", async (data: { offlineVals: string[] }) => {
    const { offlineVals } = data;
    const session = (await chaindata.getSession()) || 0;
    for (const val of offlineVals) {
      const candidate = await queries.getCandidate(val);
      if (!candidate) return;
      const reason = `${candidate.name} had an offline event in session ${
        session - 1
      }`;
      let alreadyFaulted = false;
      for (const fault of candidate.faultEvents) {
        if (fault.reason === reason) {
          alreadyFaulted = true;
        }
      }
      if (alreadyFaulted) continue;

      logger.info(`Some offline: ${reason}`, scorekeeperLabel);
      await bot?.sendMessage(reason);

      await queries.pushFaultEvent(candidate.stash, reason);
      await dockPoints(candidate.stash, bot);
    }
  });

  handler.on("newSession", async (data: { sessionIndex: string }) => {
    const { sessionIndex } = data;
    logger.info(`New Session Event: ${sessionIndex}`, scorekeeperLabel);
  });
};

export const registerEventEmitterHandler = (scoreKeeper: ScoreKeeper) => {
  logger.info(`Registering event emitter handler`, scorekeeperLabel);
  jobStatusEmitter.on("jobStarted", (data) => {
    // scoreKeeper.updateJobStarted(data);
  });

  jobStatusEmitter.on("jobRunning", (data) => {
    // scoreKeeper.updateJobRunning(data);
  });

  jobStatusEmitter.on("jobFinished", (data) => {
    // scoreKeeper.updateJobFinished(data);
  });

  jobStatusEmitter.on("jobErrored", (data) => {
    // scoreKeeper.updateJobErrored(data);
  });

  jobStatusEmitter.on("jobProgress", (data) => {
    // scoreKeeper.updateJobProgress(data);
  });
};

export const registerJobStatusEventEmitterHandler = (job: Job) => {
  logger.info(
    `Registering event emitter handler for job: ${job.getName()}`,
    scorekeeperLabel,
  );
  jobStatusEmitter.on("jobStarted", (data: JobStatus) => {
    job.updateJobStatus(data);
  });

  jobStatusEmitter.on("jobRunning", (data: JobStatus) => {
    job.updateJobStatus(data);
  });

  jobStatusEmitter.on("jobFinished", (data: JobStatus) => {
    job.updateJobStatus(data);
  });

  jobStatusEmitter.on("jobErrored", (data: JobStatus) => {
    job.updateJobStatus(data);
  });

  jobStatusEmitter.on("jobProgress", (data: JobStatus) => {
    job.updateJobStatus(data);
  });
};
