import { ChainData, logger, Types, Db, Constraints } from "@1kv/common";
// import { checkUnclaimed, OTV } from "./constraints";
import Monitor from "./monitor";
import { Subscan } from "./subscan";
import { getStats, variance } from "./score";
import { otvWorker } from "@1kv/worker";

// Runs Monitor Job
export const monitorJob = async (db: Db) => {
  await otvWorker.jobs.getLatestTaggedRelease(db);
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
export const eraStatsJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.eraStatsJob(db, chaindata);
};

// Updates Era Point data for all validators
export const eraPointsJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.eraPointsJob(db, chaindata);
};

// TODO:

// Updates validator preferences for all validators
export const validatorPrefJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.validatorPrefJob(db, chaindata);
};

// Updates session keys of all validators
export const sessionKeyJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.sessionKeyJob(db, chaindata);
};

// Updates the inclusion rate of all validators
export const inclusionJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.InclusionJob(db, chaindata);
};

export const activeValidatorJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.activeValidatorJob(db, chaindata);
};

// Job for aggregating location stats of all nodes
export const locationStatsJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.locationStatsJob(db, chaindata);
};

// Job for querying and setting council and election related data
export const councilJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.councilJob(db, chaindata);
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
export const democracyJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.democracyJob(db, chaindata);
};

export const nominatorJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.nominatorJob(db, chaindata);
};

export const delegationJob = async (db: Db, chaindata: ChainData) => {
  await otvWorker.jobs.delegationJob(db, chaindata);
};
