import { ChainData, logger, Models, queries, Util } from "@1kv/common";

export const validatorPrefLabel = { label: "ValidatorPrefJob" };

export const individualValidatorPrefJob = async (
  chaindata: ChainData,
  candidate: Models.Candidate,
) => {
  try {
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

export const validatorPrefJob = async (chaindata: ChainData) => {
  try {
    const candidates = await queries.allCandidates();

    for (const candidate of candidates) {
      await individualValidatorPrefJob(chaindata, candidate);
    }
  } catch (e) {
    logger.error(
      `Error setting validator preferences: ${e}`,
      validatorPrefLabel,
    );
  }
};

export const validatorPrefJobWithTiming = Util.withExecutionTimeLogging(
  validatorPrefJob,
  validatorPrefLabel,
  "Validator Preferences Job Done",
);

export const processValidatorPrefJob = async (
  job: any,
  chaindata: ChainData,
  candidateAddress?: string,
) => {
  try {
    // Process and individual Validator
    if (candidateAddress) {
      const candidate = await queries.getCandidate(candidateAddress);
      await individualValidatorPrefJob(chaindata, candidate);
    } else {
      // Process All Validators
      await validatorPrefJob(chaindata);
    }
  } catch (e) {
    logger.error(
      `Error processing validator preferences: ${e}`,
      validatorPrefLabel,
    );
  }
};
