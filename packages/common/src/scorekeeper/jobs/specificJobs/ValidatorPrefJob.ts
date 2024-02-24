import { logger, Models, queries, Util } from "../../../index";
import { jobsMetadata } from "../JobsClass";

export const validatorPrefLabel = { label: "ValidatorPrefJob" };

export const individualValidatorPrefJob = async (
  metadata: jobsMetadata,
  candidate: Models.Candidate,
) => {
  try {
    const { chaindata } = metadata;
    const start = Date.now();

    // Set Identity
    const exists = await queries.getIdentity(candidate.stash);
    if (!exists || !candidate.identity) {
      const identity = await chaindata.getFormattedIdentity(candidate.stash);
      await queries.setCandidateIdentity(candidate.stash, identity);
    }

    // Set Commission
    const [commission, err] = await chaindata.getCommission(candidate.stash);
    const formattedCommission =
      commission == 0 ? 0 : commission / Math.pow(10, 7);
    await queries.setCommission(candidate.stash, formattedCommission);

    // Set Controller
    const controller = await chaindata.getControllerFromStash(candidate.stash);
    await queries.setController(candidate.stash, controller);

    // Set reward destination
    const rewardDestination = await chaindata.getRewardDestination(
      candidate.stash,
    );
    await queries.setRewardDestination(candidate.stash, rewardDestination);

    // set bonded amount
    const [bonded, err2] = await chaindata.getBondedAmount(candidate.stash);
    await queries.setBonded(candidate.stash, bonded);

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
  metadata: jobsMetadata,
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
      metadata.jobStatusEmitter.emit("jobProgress", {
        name: "Validator Pref Job",
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
    return false;
  }
};

export const validatorPrefJobWithTiming = Util.withExecutionTimeLogging(
  validatorPrefJob,
  validatorPrefLabel,
  "Validator Preferences Job Done",
);

export const processValidatorPrefJob = async (
  job: any,
  metadata: jobsMetadata,
  candidateAddress?: string,
) => {
  try {
    // Process and individual Validator
    if (candidateAddress) {
      const candidate = await queries.getCandidate(candidateAddress);
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
