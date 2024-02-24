import { logger, Util } from "../../../index";
import { jobsMetadata } from "../JobsClass";

export const unclaimedErasLabel = { label: "UnclaimedErasJob" };

export const unclaimedErasJob = async (metadata: jobsMetadata) => {
  const { chaindata } = metadata;
  logger.info(`Unclaimed Eras done`, unclaimedErasLabel);
};

export const unclaimedEraJobWithTiming = Util.withExecutionTimeLogging(
  unclaimedErasJob,
  unclaimedErasLabel,
  "Unclaimed Eras Job Done",
);

// export const processUnclaimedErasJob = async (
//   job: any,
//   chaindata: ChainData,
//   candidateAddress?: string
// ) => {
//   // Process and individual Validator
//   if (candidateAddress) {
//     const candidate = await queries.getCandidate(candidateAddress);
//     await individualValidatorPrefJob(chaindata, candidate);
//   } else {
//     // Process All Validators
//     await validatorPrefJob(chaindata);
//   }
// };
