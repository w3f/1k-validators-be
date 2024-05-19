import { logger } from "../../../index";
import { JobRunnerMetadata } from "../types";
import { withExecutionTimeLogging } from "../../../utils";

export const unclaimedErasLabel = { label: "UnclaimedErasJob" };

export const unclaimedErasJob = async (metadata: JobRunnerMetadata) => {
  const { chaindata } = metadata;
  logger.info(`Unclaimed Eras done`, unclaimedErasLabel);
};

export const unclaimedEraJobWithTiming = withExecutionTimeLogging(
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
