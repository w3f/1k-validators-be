import Db from "./db";
import ChainData from "./chaindata";
import logger from "./logger";
import { checkUnclaimed, OTV } from "./constraints";
import Monitor from "./monitor";
import { Subscan } from "./subscan";
import { Referendum, ReferendumVote } from "./types";
import { getStats, variance } from "./score";

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
    // const unclaimedEras = await chaindata.getUnclaimedEras(candidate.stash, db);
    // await db.setUnclaimedEras(candidate.stash, unclaimedEras);
    await db.setUnclaimedEras(candidate.stash, []); // reset unclaimed eras
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
  const locationValues = locationArr.map((location) => {
    return location.numberOfNodes;
  });
  const locationVariance = variance(locationValues);

  // ---------------- CITY -----------------------------------
  const cityMap = new Map();
  const cityArr = [];
  for (const candidate of candidates) {
    const city =
      candidate.infrastructureLocation && candidate.infrastructureLocation.city
        ? candidate.infrastructureLocation.city
        : "No Location";

    const cityCount = cityMap.get(city);
    if (!cityCount) {
      cityMap.set(city, 1);
    } else {
      cityMap.set(city, cityCount + 1);
    }
  }

  for (const city of cityMap.entries()) {
    const [name, numberOfNodes] = city;
    cityArr.push({ name, numberOfNodes });
  }

  const cityValues = cityArr.map((city) => {
    return city.numberOfNodes;
  });
  const cityVariance = variance(cityValues);

  // ---------------- REGION -----------------------------------
  const regionMap = new Map();
  const regionArr = [];
  for (const candidate of candidates) {
    const region =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.region
        ? candidate.infrastructureLocation.region
        : "No Location";

    const regionCount = regionMap.get(region);
    if (!regionCount) {
      regionMap.set(region, 1);
    } else {
      regionMap.set(region, regionCount + 1);
    }
  }

  for (const region of regionMap.entries()) {
    const [name, numberOfNodes] = region;
    regionArr.push({ name, numberOfNodes });
  }
  const regionValues = regionArr.map((region) => {
    return region.numberOfNodes;
  });
  const regionVariance = variance(regionValues);

  // ---------------- COUNTRY -----------------------------------
  const countryMap = new Map();
  const countryArr = [];
  for (const candidate of candidates) {
    const country =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.country
        ? candidate.infrastructureLocation.country
        : "No Location";

    const countryCount = countryMap.get(country);
    if (!countryCount) {
      countryMap.set(country, 1);
    } else {
      countryMap.set(country, countryCount + 1);
    }
  }

  for (const country of countryMap.entries()) {
    const [name, numberOfNodes] = country;
    countryArr.push({ name, numberOfNodes });
  }
  const countryValues = countryArr.map((country) => {
    return country.numberOfNodes;
  });
  const countryVariance = variance(countryValues);

  // ---------------- ASN -----------------------------------
  const asnMap = new Map();
  const asnArr = [];
  for (const candidate of candidates) {
    const asn =
      candidate.infrastructureLocation && candidate.infrastructureLocation.asn
        ? candidate.infrastructureLocation.asn
        : "No Location";

    const asnCount = asnMap.get(asn);
    if (!asnCount) {
      asnMap.set(asn, 1);
    } else {
      asnMap.set(asn, asnCount + 1);
    }
  }

  for (const asn of asnMap.entries()) {
    const [name, numberOfNodes] = asn;
    asnArr.push({ name, numberOfNodes });
  }
  const asnValues = asnArr.map((asn) => {
    return asn.numberOfNodes;
  });
  const asnVariance = variance(asnValues);

  // ---------------- PROVIDER -----------------------------------
  const providerMap = new Map();
  const providerArr = [];
  for (const candidate of candidates) {
    const provider =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.provider
        ? candidate.infrastructureLocation.provider
        : "No Location";

    const providerCount = providerMap.get(provider);
    if (!providerCount) {
      providerMap.set(provider, 1);
    } else {
      providerMap.set(provider, providerCount + 1);
    }
  }

  for (const provider of providerMap.entries()) {
    const [name, numberOfNodes] = provider;
    providerArr.push({ name, numberOfNodes });
  }
  const providerValues = providerArr.map((provider) => {
    return provider.numberOfNodes;
  });
  const providerVariance = variance(providerValues);

  const decentralization =
    (locationVariance +
      regionVariance +
      countryVariance +
      asnVariance +
      providerVariance) /
    5;

  // --------------------------

  await db.setLocationStats(
    session,
    locationArr,
    regionArr,
    countryArr,
    asnArr,
    providerArr,
    locationVariance,
    regionVariance,
    countryVariance,
    asnVariance,
    providerVariance,
    decentralization
  );

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
      // if (blockNumber == 0) {
      //   unclaimedRewards.push(era);
      //   await db.setUnclaimedEras(candidate.stash, unclaimedRewards);
      // }

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

    const avgClaimTimestampDelta =
      !isNaN(rewards.length) && rewards.length > 0
        ? totalClaimTimestampDelta / rewards.length
        : 0;
    const avgClaimBlockDelta =
      !isNaN(rewards.length) && rewards.length > 0
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

// Job for democracy related data
export const democracyJob = async (db: Db, chaindata: ChainData) => {
  const start = Date.now();

  const latestBlockNumber = await chaindata.getLatestBlock();
  const latestBlockHash = await chaindata.getLatestBlockHash();
  const denom = await chaindata.getDenom();

  const referendaQuery = await chaindata.getDerivedReferenda();
  for (const r of referendaQuery) {
    if (!r) continue;
    const {
      // The image that was proposed
      image: {
        // The block at which the proposal was made
        at = 0,
        // The planck denominated deposit made for the gov call
        balance = 0,
        // Details about the specific proposal, including the call
        // proposal,
        // the address that made the proposal
        proposer = "0x",
      } = {},
      imageHash,
      index,
      status: {
        // The block the referendum closes at
        end = 0,
        // image hash
        // proposalHash,
        // The kind of turnout is needed, ie 'SimplyMajority'
        threshold = "",
        // how many blocks after the end block that it takes for the proposal to get enacted
        delay,
      } = {},
      // list of accounts that voted aye
      // allAye,
      // list of accounts that voted nay
      // allNay,
      // the total amounts of votes
      voteCount = 0,
      // the total amount of aye votes
      voteCountAye = 0,
      // the total amount of nay votes
      voteCountNay = 0,
      // the total amount of tokens voted aye
      votedAye = 0,
      // the total amount of tokens voted nay
      votedNay = 0,
      // the total amount of tokens voted
      votedTotal = 0,
      // whether the proposal is currently passing
      isPassing,
      // the list of votes
      votes,
    } = r;

    const referendum: Referendum = {
      referendumIndex: index.toNumber() || 0,
      proposedAt: Number(at) || 0,
      proposalEnd: Number(end) || 0,
      proposalDelay: delay.toNumber() || 0,
      threshold: threshold.toString() || "",
      deposit: parseFloat(balance.toString()) / denom || 0,
      proposer: proposer.toString() || "",
      imageHash: imageHash.toString() || "",
      voteCount: voteCount || 0,
      voteCountAye: voteCountAye || 0,
      voteCountNay: voteCountNay | 0,
      voteAyeAmount: parseFloat(votedAye.toString()) / denom || 0,
      voteNayAmount: parseFloat(votedNay.toString()) / denom || 0,
      voteTotalAmount: parseFloat(votedTotal.toString()) / denom || 0,
      isPassing: isPassing || false,
    };

    await db.setReferendum(referendum, latestBlockNumber, latestBlockHash);

    // Go through all votes for the referendum and update db entries for them
    for (const v of votes) {
      // @ts-ignore
      const { accountId, isDelegating, initialU8aLength, vote, balance } = v;
      // @ts-ignore
      const { vote: voteDirection, conviction } = vote.toHuman();

      const referendumVote: ReferendumVote = {
        referendumIndex: index.toNumber(),
        accountId: accountId.toString(),
        isDelegating: isDelegating,
        balance: parseFloat(balance.toString()) / denom,
        voteDirection: voteDirection,
        conviction: conviction,
      };

      await db.setReferendumVote(
        referendumVote,
        latestBlockNumber,
        latestBlockHash
      );
    }
  }

  const endTime = Date.now();

  logger.info(
    `{cron::councilJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(endTime - start) / 1000} seconds`
  );
};

export const nominatorJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  const [activeEra, err] = await chaindata.getActiveEraIndex();

  const nominators = await chaindata.getNominators();

  for (const candidate of candidates) {
    // A validators active nominators
    const { total, others } = await chaindata.getExposure(
      activeEra,
      candidate.stash
    );
    const allNominators = await Promise.all(
      nominators.filter((nom) => {
        return nom.targets.includes(candidate.stash);
      })
    );
    const inactiveNominators = allNominators.filter((nominator) => {
      let active = false;
      others.forEach((other) => {
        if (other.address === nominator.address) {
          active = true;
        }
      });
      return !active;
    });

    let totalInactiveStake = 0;
    inactiveNominators.forEach((nominator) => {
      totalInactiveStake += nominator.bonded;
    });

    await db.setNominatorStake(
      candidate.stash,
      activeEra,
      total,
      totalInactiveStake,
      others,
      inactiveNominators
    );
  }

  const end = Date.now();

  logger.info(
    `{cron::NominatorStakeJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const delegationJob = async (
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const start = Date.now();

  const delegators = await chaindata.getDelegators();

  for (const candidate of candidates) {
    const delegating = delegators.filter((delegator) => {
      if (delegator.target == candidate.stash) return true;
    });

    let totalBalance = 0;
    for (const delegator of delegating) {
      totalBalance += delegator.effectiveBalance;
    }

    await db.setDelegation(candidate.stash, totalBalance, delegating);
  }

  const end = Date.now();

  logger.info(
    `{cron::delegationJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};
