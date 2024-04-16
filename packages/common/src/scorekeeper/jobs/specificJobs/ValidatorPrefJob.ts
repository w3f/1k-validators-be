import { logger, Models, queries } from "../../../index";
import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";
import { JobNames } from "../JobConfigs";

export const validatorPrefLabel = { label: "ValidatorPrefJob" };

export class ValidatorPrefJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const individualValidatorPrefJob = async (
  metadata: JobRunnerMetadata,
  candidate: Models.Candidate,
) => {
  try {
    const { chaindata } = metadata;
    const start = Date.now();

    // Set Identity
    const exists = await queries.getIdentity(candidate.stash);
    if (!exists || !candidate.identity) {
      const identity = await chaindata.getFormattedIdentity(candidate.stash);
      if (identity) {
        await queries.setCandidateIdentity(candidate.stash, identity);
      }
    }

    // Set Commission
    const [commission, err] = await chaindata.getCommission(candidate.stash);
    const formattedCommission =
      commission == 0 ? 0 : commission / Math.pow(10, 7);
    await queries.setCommission(candidate, formattedCommission);

    // Set Controller
    const controller = await chaindata.getControllerFromStash(candidate.stash);
    if (!controller) {
      return;
    }
    await queries.setController(candidate.stash, controller);

    // Set reward destination
    const rewardDestination = await chaindata.getRewardDestination(
      candidate.stash,
    );
    if (!rewardDestination) {
      return;
    }
    await queries.setRewardDestination(candidate, rewardDestination);

    // set bonded amount
    const [bonded, err2] = await chaindata.getBondedAmount(candidate.stash);
    if (!bonded) {
      return;
    }
    await queries.setBonded(candidate, bonded);

    const end = Date.now();
    const executionTime = (end - start) / 1000;
    logger.info(
      `${candidate.name} done (${executionTime}s)`,
      validatorPrefLabel,
    );
  } catch (e) {
    logger.error(
      `Error setting validator preferences: ${e}`,
      validatorPrefLabel,
    );
  }
};

export const validatorPrefJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const candidates = await queries.allCandidates();
    const totalCandidates = candidates.length;
    let processedCandidates = 0;

    for (const candidate of candidates) {
      await individualValidatorPrefJob(metadata, candidate);
      processedCandidates++;

      // Calculate progress percentage
      const progress = Math.floor(
        (processedCandidates / totalCandidates) * 100,
      );

      // Emit progress update event with candidate's name
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.ValidatorPref,
        progress,
        updated: Date.now(),
        iteration: `Processed candidate ${candidate.name}`,
      });
    }
    return true;
  } catch (e) {
    logger.error(
      `Error setting validator preferences: ${e}`,
      validatorPrefLabel,
    );

    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.ValidatorPref,
      updated: Date.now(),
      error: JSON.stringify(e),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
    return false;
  }
};

export const validatorPrefJobWithTiming = withExecutionTimeLogging(
  validatorPrefJob,
  validatorPrefLabel,
  "Validator Preferences Job Done",
);

export const processValidatorPrefJob = async (
  job: any,
  metadata: JobRunnerMetadata,
  candidateAddress?: string,
) => {
  try {
    // Process and individual Validator
    if (candidateAddress) {
      const candidate = await queries.getCandidateByStash(candidateAddress);
      if (!candidate) {
        return;
      }
      await individualValidatorPrefJob(metadata, candidate);
    } else {
      // Process All Validators
      await validatorPrefJob(metadata);
    }
  } catch (e) {
    logger.error(
      `Error processing validator preferences: ${e}`,
      validatorPrefLabel,
    );
  }
};
