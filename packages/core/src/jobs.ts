import { ChainData, Constraints } from "@1kv/common";
import { otvWorker } from "@1kv/worker";

// Runs Monitor Job
export const monitorJob = async () => {
  await otvWorker.jobs.getLatestTaggedRelease();
};

// Runs Validity Job
export const validityJob = async (constraints: Constraints.OTV) => {
  await otvWorker.jobs.validityJob(constraints);
};

// Runs Score Candidate Job
export const scoreJob = async (constraints: Constraints.OTV) => {
  await otvWorker.jobs.scoreJob(constraints);
};

// Updates the era stats
export const eraStatsJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.eraStatsJob(chaindata);
};

// Updates Era Point data for all validators
export const eraPointsJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.eraPointsJob(chaindata);
};

// TODO:

// Updates validator preferences for all validators
export const validatorPrefJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.validatorPrefJob(chaindata);
};

// Updates session keys of all validators
export const sessionKeyJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.sessionKeyJob(chaindata);
};

// Updates the inclusion rate of all validators
export const inclusionJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.inclusionJob(chaindata);
};

export const activeValidatorJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.activeValidatorJob(chaindata);
};

// Job for aggregating location stats of all nodes
export const locationStatsJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.locationStatsJob(chaindata);
};

// Job for querying and setting council and election related data
export const councilJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.councilJob(chaindata);
};

// Job for querying subscan data
// export const subscanJob = async (
//   db: Db,
//   subscan: Subscan,
//   candidates: any[]
// ) => {
//   const start = Date.now();
//
//   // Era Paid Events Query
//   const eraPaidEvents = await subscan.getEraPaid();
//   for (const event of eraPaidEvents) {
//     if (event) {
//       const {
//         era,
//         blockNumber,
//         blockTimestamp,
//         eventIndex,
//         moduleId,
//         eventId,
//         totalValidatorsReward,
//         totalRemainderReward,
//       } = event;
//       await db.setEraPaidEvent(
//         era,
//         blockNumber,
//         blockTimestamp,
//         eventIndex,
//         moduleId,
//         eventId,
//         totalValidatorsReward,
//         totalRemainderReward
//       );
//     } else {
//       logger.info(`{cron::subscanJob::eraPaidEvent} event ${event} is empty`);
//     }
//   }
//
//   // Rewards Query
//   for (const candidate of candidates) {
//     const rewards = await subscan.getRewards(candidate.stash);
//
//     let totalRewards = 0;
//     let totalClaimTimestampDelta = 0;
//     let totalClaimBlockDelta = 0;
//     for (const reward of rewards) {
//       const {
//         era,
//         stash,
//         rewardDestination,
//         validatorStash,
//         amount,
//         blockTimestamp,
//         blockNumber,
//         slashKTon,
//       } = reward;
//
//       const unclaimedRewards = candidate.unclaimedEras;
//
//       // If the block number is zero, add to unclaimed rewards
//       // if (blockNumber == 0) {
//       //   unclaimedRewards.push(era);
//       //   await db.setUnclaimedEras(candidate.stash, unclaimedRewards);
//       // }
//
//       // set reward as claimed
//       // if (blockNumber != 0 && candidate.unclaimedEras.includes(era)) {
//       //   const index = unclaimedRewards.indexOf(era);
//       //   if (index > -1) {
//       //     unclaimedRewards.splice(index, 1);
//       //     await db.setUnclaimedEras(candidate.stash, unclaimedRewards);
//       //   }
//       // }
//
//       const eraPaid = await db.getEraPaidEvent(era);
//       const eraPaidBlockNumber = eraPaid?.blockNumber
//         ? eraPaid?.blockNumber
//         : 0;
//       const eraPaidBlockTimestamp = eraPaid?.blockTimesamp
//         ? eraPaid?.blockTimesamp
//         : 0;
//
//       const claimTimestampDelta =
//         blockTimestamp != 0 ? eraPaidBlockTimestamp - blockTimestamp : 0;
//       const claimBlockDelta =
//         blockNumber != 0 ? eraPaidBlockNumber - blockNumber : 0;
//
//       totalRewards = totalRewards + amount;
//       totalClaimTimestampDelta = totalClaimTimestampDelta + claimTimestampDelta;
//       totalClaimBlockDelta = totalClaimBlockDelta + claimBlockDelta;
//
//       await db.setEraReward(
//         era,
//         stash,
//         rewardDestination,
//         validatorStash,
//         amount,
//         blockTimestamp,
//         blockNumber,
//         slashKTon,
//         claimTimestampDelta ? claimTimestampDelta : 0,
//         claimBlockDelta ? claimBlockDelta : 0
//       );
//     }
//
//     const avgClaimTimestampDelta =
//       !isNaN(rewards.length) && rewards.length > 0
//         ? totalClaimTimestampDelta / rewards.length
//         : 0;
//     const avgClaimBlockDelta =
//       !isNaN(rewards.length) && rewards.length > 0
//         ? totalClaimBlockDelta / rewards.length
//         : 0;
//     await db.setClaimDelta(
//       candidate.stash,
//       avgClaimBlockDelta,
//       avgClaimTimestampDelta
//     );
//     await db.setTotalRewards(candidate.stash, totalRewards);
//   }
//
//   const end = Date.now();
//
//   logger.info(
//     `{cron::subscanJob::ExecutionTime} started at ${new Date(
//       start
//     ).toString()} Done. Took ${(end - start) / 1000} seconds`
//   );
// };

// Job for democracy related data
export const democracyJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.democracyJob(chaindata);
};

export const nominatorJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.nominatorJob(chaindata);
};

export const delegationJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.delegationJob(chaindata);
};
