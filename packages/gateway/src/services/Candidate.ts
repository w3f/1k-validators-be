import { logger, queries } from "@1kv/common";

const label = { label: "Gateway" };

export const getCandidateData = async (candidate: any): Promise<any> => {
  const [metadata, score, nominations, location] = await Promise.all([
    queries.getChainMetadata(),
    queries.getLatestValidatorScore(candidate.stash),
    queries.getLatestNominatorStake(candidate.stash),
    queries.getCandidateLocation(candidate.slotId),
  ]);

  const denom = Math.pow(10, metadata.decimals);

  return {
    slotId: candidate.slotId,
    kyc: candidate.kyc,
    discoveredAt: candidate.discoveredAt,
    nominatedAt: candidate.nominatedAt,
    offlineSince: candidate.offlineSince,
    offlineAccumulated: candidate.offlineAccumulated,
    rank: candidate.rank || 0,
    faults: candidate.faults,
    invalidityReasons: candidate.invalidityReasons,
    unclaimedEras: candidate.unclaimedEras,
    inclusion: candidate.inclusion,
    name: candidate.name,
    stash: candidate.stash,
    kusamaStash: candidate.kusamaStash,
    commission: candidate.commission,
    identity: candidate.identity,
    active: candidate.active,
    bonded: candidate.bonded / denom,
    valid: candidate.valid,
    validity: candidate.invalidity,
    score: score,
    total: score && score.total ? score.total : 0,
    location: location?.city,
    provider: location?.provider,
    cpu: location?.cpu,
    memory: location?.memory,
    coreCount: location?.coreCount,
    vm: location?.vm,
    region: location?.region,
    country: location?.country,
    matrix: candidate.matrix,
    version: candidate.version,
    implementation: candidate.implementation,
    queuedKeys: candidate.queuedKeys,
    nextKeys: candidate.nextKeys,
    rewardDestination: candidate.rewardDestination,
    nominations: {
      totalStake: nominations?.totalStake,
      inactiveStake: nominations?.inactiveStake,
      activeNominators: nominations?.activeNominators?.length,
      inactiveNominators: nominations?.inactiveNominators?.length,
    },
  };
};

export const getCandidate = async (stash: any): Promise<any> => {
  let candidate;

  try {
    candidate = await queries.getCandidateByStash(stash);
    if (candidate && candidate.stash) {
      return await getCandidateData(candidate);
    }
  } catch (error) {
    logger.error(
      `findCandidate: ${candidate?.name} ${stash}`,
      { error },
      label,
    );
  }
};

export const getValidCandidates = async (): Promise<any> => {
  let validCandidates = await queries.validCandidates();
  validCandidates = await Promise.all(
    validCandidates.map(async (candidate) => {
      return await getCandidateData(candidate);
    }),
  );
  return validCandidates;
};

export const getInvalidCandidates = async (): Promise<any> => {
  let invalidCandidates = await queries.invalidCandidates();
  invalidCandidates = await Promise.all(
    invalidCandidates.map(async (candidate) => {
      return await getCandidateData(candidate);
    }),
  );
  return invalidCandidates;
};

export const getCandidates = async (): Promise<any> => {
  const allCandidates = await queries.allCandidates();
  const candidatesWithAdditionalFields = await Promise.all(
    allCandidates.map(async (candidate) => {
      return await getCandidateData(candidate);
    }),
  );
  return candidatesWithAdditionalFields.sort((a, b) => {
    return b.total - a.total;
  });
};

export const getRankCandidates = async (): Promise<any> => {
  let allCandidates = await queries.allCandidates();
  allCandidates = await Promise.all(
    allCandidates.map(async (candidate) => {
      return await getCandidateData(candidate);
    }),
  );
  allCandidates = allCandidates.sort((a, b) => {
    return b.rank - a.rank;
  });
  return allCandidates;
};

export const getLatestNominatorStake = async (address): Promise<any> => {
  const stake = await queries.getLatestNominatorStake(address);
  return stake;
};

export const getEraNominatorStake = async (address, era): Promise<any> => {
  const stake = await queries.getEraNominatorStake(address, era);
  return stake;
};

export const getNominatorStake = async (address, limit): Promise<any> => {
  const stake = await queries.getNominatorStake(address, limit);
  return stake;
};
