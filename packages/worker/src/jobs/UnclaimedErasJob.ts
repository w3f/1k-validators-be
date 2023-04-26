import { ChainData, logger } from "@1kv/common";

export const unclaimedErasLabel = { label: "UnclaimedErasJob" };

export const unclaimedErasJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const end = Date.now();
  const executionTime = (end - start) / 1000;
  logger.info(`Unclaimed Eras done (${executionTime}s)`, unclaimedErasLabel);
};

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
