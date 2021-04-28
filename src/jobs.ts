import Db from "./db";
import ChainData from "./chaindata";
import logger from "./logger";

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
  candidates: any[]
) => {
  const start = Date.now();

  for (const candidate of candidates) {
    // Set unclaimed eras
    const unclaimedEras = await chaindata.getUnclaimedEras(candidate.stash, db);
    await db.setUnclaimedEras(candidate.stash, unclaimedEras);
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
