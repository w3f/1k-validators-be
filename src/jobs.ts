import Db from "./db";
import ChainData from "./chaindata";
import logger from "./logger";
import { checkUnclaimed, OTV } from "./constraints";
import Monitor from "./monitor";
import { Subscan } from "./subscan";
import { arrayBuffer } from "stream/consumers";

// Runs Monitor Job
export const monitorJob = async (db: Db, monitor: Monitor) => {
  const start = Date.now();

  logger.info(`(cron::Monitor::start) Running Monitor job`);
  await monitor.getLatestTaggedRelease();

  const end = Date.now();

  logger.info(
    `{cron::Monitor::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Runs Validity Job
export const validityJob = async (
  db: Db,
  chaindata: ChainData,
  allCandidates: any[],
  constraints: OTV
) => {
  const start = Date.now();

  logger.info(`(cron::Validity::start) Running validity cron`);

  for (const candidate of allCandidates) {
    await constraints.checkCandidate(candidate);
  }

  const end = Date.now();

  logger.info(
    `{cron::Validity::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Runs Score Candidate Job
export const scoreJob = async (constraints: OTV) => {
  const start = Date.now();

  logger.info(`(cron::Score::start) Running score cron`);

  constraints.scoreAllCandidates();

  const end = Date.now();

  logger.info(
    `{cron::Score::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Updates the era stats
export const eraStatsJob = async (
  db: Db,
  chaindata: ChainData,
  allCandidates: any[]
) => {
  const start = Date.now();

  logger.info(`(cron::eraStats::start) Running era stats cron`);

  const currentEra = await chaindata.getCurrentEra();

  const valid = allCandidates.filter((candidate) => candidate.valid);
  const active = allCandidates.filter((candidate) => candidate.active);

  await db.setEraStats(
    Number(currentEra),
    allCandidates.length,
    valid.length,
    active.length
  );

  const end = Date.now();

  logger.info(
    `{cron::eraStats::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Updates Era Point data for all validators
export const eraPointsJob = async (db: Db, chaindata: ChainData) => {
  const start = Date.now();

  // Set Era Points
  //    - get the current active era
  //    - iterate through the previous 84 eras
  //    - if a record for era points for that era already exists, skip it
  //    - if a record doesn't exist, create it
  logger.info(`{cron::EraPointsJob} setting era info`);
  const [activeEra, err] = await chaindata.getActiveEraIndex();
  for (let i = activeEra - 1; i > activeEra - 84 && i >= 0; i--) {
    const erapoints = await db.getTotalEraPoints(i);

    if (!!erapoints && erapoints.totalEraPoints >= 70000 && erapoints.median) {
      continue;
    } else {
      logger.info(
        `{cron::EraPointsJob} era ${i} point data doesnt exist. Creating....`
      );
      const { era, total, validators } = await chaindata.getTotalEraPoints(i);
      await db.setTotalEraPoints(era, total, validators);
    }
  }
  const { era, total, validators } = await chaindata.getTotalEraPoints(
    activeEra
  );
  await db.setTotalEraPoints(era, total, validators);

  const end = Date.now();

  logger.info(
    `{cron::EraPointsJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Updates validator preferences for all validators
export const validatorPrefJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  for (const candidate of candidates) {
    // Set Identity
    const identity = await chaindata.getFormattedIdentity(candidate.stash);
    await db.setIdentity(candidate.stash, identity);

    // Set Commission
    const [commission, err] = await chaindata.getCommission(candidate.stash);
    const formattedCommission =
      commission == 0 ? 0 : commission / Math.pow(10, 7);
    await db.setCommission(candidate.stash, formattedCommission);

    // Set Controller
    const controller = await chaindata.getControllerFromStash(candidate.stash);
    await db.setController(candidate.stash, controller);

    // Set reward destination
    const rewardDestination = await chaindata.getRewardDestination(
      candidate.stash
    );
    await db.setRewardDestination(candidate.stash, rewardDestination);

    // set bonded amount
    const [bonded, err2] = await chaindata.getBondedAmount(candidate.stash);
    await db.setBonded(candidate.stash, bonded);
  }

  const end = Date.now();

  logger.info(
    `{cron::ValidatorPrefJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Updates unclaimed eras of all validators
export const unclaimedErasJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[],
  unclaimedEraThreshold: number
) => {
  const start = Date.now();

  for (const candidate of candidates) {
    // Set unclaimed eras
    const unclaimedEras = await chaindata.getUnclaimedEras(candidate.stash, db);
    await db.setUnclaimedEras(candidate.stash, unclaimedEras);
    await checkUnclaimed(db, chaindata, unclaimedEraThreshold, candidate);
  }

  const end = Date.now();

  logger.info(
    `{cron::UnclaimedEraJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Updates session keys of all validators
export const sessionKeyJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  // All queued keyes
  const queuedKeys = await chaindata.getQueuedKeys();

  for (const candidate of candidates) {
    // Set queued keys
    for (const key of queuedKeys) {
      if (key.address == candidate.stash) {
        await db.setQueuedKeys(candidate.stash, key.keys);
      }
    }

    // Set Next Keys
    const nextKeys = await chaindata.getNextKeys(candidate.stash);
    await db.setNextKeys(candidate.stash, nextKeys);
  }

  const end = Date.now();

  logger.info(
    `{cron::SessionKeyJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Updates the inclusion rate of all validators
export const inclusionJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  const [activeEra, err] = await chaindata.getActiveEraIndex();

  for (const candidate of candidates) {
    // Set inclusion Rate
    const erasActive = await db.getHistoryDepthEraPoints(
      candidate.stash,
      activeEra
    );
    const filteredEras = erasActive.filter((era) => era.eraPoints > 0);
    const inclusion = Number(filteredEras.length / 84);
    await db.setInclusion(candidate.stash, inclusion);

    // Set span inclusion Rate
    const spanErasActive = await db.getSpanEraPoints(
      candidate.stash,
      activeEra
    );
    const filteredSpanEras = spanErasActive.filter(
      (era: any) => era.eraPoints > 0
    );
    const spanInclusion = Number(filteredSpanEras.length / 28);
    await db.setSpanInclusion(candidate.stash, spanInclusion);
  }

  const end = Date.now();

  logger.info(
    `{cron::InclusionJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const activeValidatorJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  // The current active validators in the validator set.
  const activeValidators = await chaindata.currentValidators();

  for (const candidate of candidates) {
    // Set if the validator is active in the set
    const active = activeValidators.includes(candidate.stash);
    await db.setActive(candidate.stash, active);
  }

  const end = Date.now();

  logger.info(
    `{cron::ActiveValidatorJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Job for aggregating location stats of all nodes
export const locationStatsJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  const session = await chaindata.getSession();

  const locationMap = new Map();
  const locationArr = [];

  // Iterate through all candidates and set
  for (const candidate of candidates) {
    const location = candidate.location || "No Location";
    const address = candidate.stash;

    const locationCount = locationMap.get(location);
    if (!locationCount) {
      locationMap.set(location, 1);
    } else {
      locationMap.set(location, locationCount + 1);
    }
  }

  for (const location of locationMap.entries()) {
    const [name, numberOfNodes] = location;
    locationArr.push({ name, numberOfNodes });
  }

  await db.setLocationStats(session, locationArr);

  const end = Date.now();

  logger.info(
    `{cron::locationStatsJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Job for querying and setting council and election related data
export const councilJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  const session = await chaindata.getSession();

  // An array of all candidate stashes
  const candidateAddresses = candidates.map((candidate) => {
    return candidate.stash;
  });

  // Get all the votes of everyone in the network that backs a council member
  const councilVoting = await chaindata.getCouncilVoting();
  for (const vote of councilVoting) {
    const isCandidate = candidateAddresses.includes(vote.who.toString());
    if (isCandidate) {
      db.setCouncilBacking(vote.who.toString(), vote.stake, vote.votes);
    }
  }

  // Total people in the network voting for council members
  const totalVoters = councilVoting.length;
  // Total amount of tokens in the networking going towards council candidates
  const totalBonded = councilVoting.reduce((a, b) => a + b.stake, 0);

  // info about the current state of elections, including bond, desired sets, and member/runnersup/candidates
  const electionsInfo = await chaindata.getElectionsInfo();
  const { candidacyBond, desiredSeats, termDuration } = electionsInfo;

  // Update Election Stats
  const totalMembers = electionsInfo.members.length;
  const totalRunnersUp = electionsInfo.runnersUp.length;
  const totalCandidates = electionsInfo.candidates.length;
  await db.setElectionStats(
    termDuration.toNumber(),
    candidacyBond,
    totalMembers,
    totalRunnersUp,
    totalCandidates,
    totalVoters,
    totalBonded,
    session
  );

  // Update information about all councillors

  // Update members
  if (totalMembers) {
    for (const member of electionsInfo.members) {
      const { address, totalBacking } = member;
      await db.setCouncillor(address.toString(), "Member", totalBacking);
    }
  }

  // Update runners up
  if (totalRunnersUp) {
    for (const member of electionsInfo.runnersUp) {
      const { address, totalBacking } = member;
      await db.setCouncillor(address.toString(), "Runner Up", totalBacking);
    }
  }

  // update candidates
  if (totalCandidates) {
    for (const member of electionsInfo.candidates) {
      const { address, totalBacking } = member;
      await db.setCouncillor(address.toString(), "Candidate", totalBacking);
    }
  }

  const end = Date.now();

  logger.info(
    `{cron::councilJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Job for querying subscan data
export const subscanJob = async (
  db: Db,
  subscan: Subscan,
  candidates: any[]
) => {
  const start = Date.now();

  // Era Paid Events Query
  const eraPaidEvents = await subscan.getEraPaid();
  for (const event of eraPaidEvents) {
    if (event) {
      const {
        era,
        blockNumber,
        blockTimestamp,
        eventIndex,
        moduleId,
        eventId,
        totalValidatorsReward,
        totalRemainderReward,
      } = event;
      await db.setEraPaidEvent(
        era,
        blockNumber,
        blockTimestamp,
        eventIndex,
        moduleId,
        eventId,
        totalValidatorsReward,
        totalRemainderReward
      );
    } else {
      logger.info(`{cron::subscanJob::eraPaidEvent} event ${event} is empty`);
    }
  }

  // Rewards Query
  for (const candidate of candidates) {
    const rewards = await subscan.getRewards(candidate.stash);

    let totalRewards = 0;
    let totalClaimTimestampDelta = 0;
    let totalClaimBlockDelta = 0;
    for (const reward of rewards) {
      const {
        era,
        stash,
        rewardDestination,
        validatorStash,
        amount,
        blockTimestamp,
        blockNumber,
        slashKTon,
      } = reward;

      const unclaimedRewards = candidate.unclaimedEras;

      // If the block number is zero, add to unclaimed rewards
      if (blockNumber == 0) {
        unclaimedRewards.push(era);
        await db.setUnclaimedEras(candidate.stash, unclaimedRewards);
      }

      // set reward as claimed
      // if (blockNumber != 0 && candidate.unclaimedEras.includes(era)) {
      //   const index = unclaimedRewards.indexOf(era);
      //   if (index > -1) {
      //     unclaimedRewards.splice(index, 1);
      //     await db.setUnclaimedEras(candidate.stash, unclaimedRewards);
      //   }
      // }

      const eraPaid = await db.getEraPaidEvent(era);
      const eraPaidBlockNumber = eraPaid?.blockNumber
        ? eraPaid?.blockNumber
        : 0;
      const eraPaidBlockTimestamp = eraPaid?.blockTimesamp
        ? eraPaid?.blockTimesamp
        : 0;

      const claimTimestampDelta =
        blockTimestamp != 0 ? eraPaidBlockTimestamp - blockTimestamp : 0;
      const claimBlockDelta =
        blockNumber != 0 ? eraPaidBlockNumber - blockNumber : 0;

      totalRewards = totalRewards + amount;
      totalClaimTimestampDelta = totalClaimTimestampDelta + claimTimestampDelta;
      totalClaimBlockDelta = totalClaimBlockDelta + claimBlockDelta;

      await db.setEraReward(
        era,
        stash,
        rewardDestination,
        validatorStash,
        amount,
        blockTimestamp,
        blockNumber,
        slashKTon,
        claimTimestampDelta ? claimTimestampDelta : 0,
        claimBlockDelta ? claimBlockDelta : 0
      );
    }

    const avgClaimTimestampDelta = rewards
      ? totalClaimTimestampDelta / rewards.length
      : 0;
    const avgClaimBlockDelta = rewards
      ? totalClaimBlockDelta / rewards.length
      : 0;
    await db.setClaimDelta(
      candidate.stash,
      avgClaimBlockDelta,
      avgClaimTimestampDelta
    );
    await db.setTotalRewards(candidate.stash, totalRewards);
  }

  const end = Date.now();

  logger.info(
    `{cron::subscanJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};
