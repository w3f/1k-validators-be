import { logger, queries } from "@1kv/common";

const label = { label: "Gateway" };

export const getCandidateData = async (candidate: any): Promise<any> => {
  const metadata = await queries.getChainMetadata();
  const denom = Math.pow(10, metadata.decimals);
  const score = await queries.getLatestValidatorScore(candidate.stash);
  const nominations = await queries.getLatestNominatorStake(candidate.stash);
  return {
    discoveredAt: candidate.discoveredAt,
    nominatedAt: candidate.nominatedAt,
    offlineSince: candidate.offlineSince,
    offlineAccumulated: candidate.offlineAccumulated,
    rank: candidate.rank,
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
    location: candidate.location,
    provider: candidate.infrastructureLocation?.provider
      ? candidate.infrastructureLocation?.provider
      : "No Provider",
    convictionVotes: candidate.convictionVotes
      ? candidate.convictionVotes.sort((a, b) => a - b)
      : [],
    matrix: candidate.matrix,
    version: candidate.version,
    implementation: candidate.implementation,
    queuedKeys: candidate.queuedKeys,
    nextKeys: candidate.nextKeys,
    rewardDestination: candidate.rewardDestination,
    cpu: candidate.infrastructureLocation?.cpu,
    memory: candidate.infrastructureLocation?.memory,
    coreCount: candidate.infrastructureLocation?.coreCount,
    vm: candidate.infrastructureLocation?.vm,
    region: candidate.infrastructureLocation?.region,
    country: candidate.infrastructureLocation?.country,
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
    candidate = await queries.getCandidate(stash);
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
  const metadata = await queries.getChainMetadata();
  const denom = Math.pow(10, metadata?.decimals);
  let allCandidates = await queries.allCandidates();
  allCandidates = await Promise.all(
    allCandidates.map(async (candidate) => {
      return await getCandidateData(candidate);
    }),
  );
  allCandidates = allCandidates.sort((a, b) => {
    return b.total - a.total;
  });
  return allCandidates;
};

export const getNodes = async (): Promise<any> => {
  const allNodes: Array<any> = await queries.allNodes();
  return allNodes.map((node) => {
    return {
      name: node.name,
      version: node.version,
      implementation: node.implementation,
      vpn: node.infrastructureLocation?.vpn,
      cpu: node.infrastructureLocation?.cpu,
      memory: node.infrastructureLocation?.memory,
      coreCount: node.infrastructureLocation?.coreCount,
      vm: node.infrastructureLocation?.vm,
      location: node.infrastructureLocation?.location,
      region: node.infrastructureLocation?.region,
      country: node.infrastructureLocation?.country,
      provider: node.infrastructureLocation?.provider,
    };
  });
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
