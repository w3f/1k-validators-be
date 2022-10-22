import { queries } from "@1kv/common";

export const getLatestElectionStats = async (): Promise<any> => {
  const electionStats = await queries.getLatestElectionStats();
  return electionStats;
};

export const getCouncillors = async (): Promise<any> => {
  const councillors = await queries.getAllCouncillors();
  return councillors;
};

export const getCouncillor = async (address): Promise<any> => {
  const councillor = await queries.getCouncillor(address);
  return councillor;
};

export const getVoters = async (): Promise<any> => {
  let allCandidates = await queries.allCandidates();
  allCandidates = await Promise.all(
    allCandidates.map(async (candidate) => {
      const score = await queries.getValidatorScore(candidate.stash);
      if (candidate.councilStake && candidate.councilStake > 0)
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
          valid: candidate.valid,
          validity: candidate.invalidity,
          score: score,
          total: score && score.total ? score.total : 0,
          location: candidate.location,
          councilStake: candidate.councilStake,
          councilVotes: candidate.councilVotes,
          democracyVoteCount: candidate.democracyVoteCount,
          democracyVotes: candidate.democracyVotes,
        };
    })
  );
  allCandidates = allCandidates.sort((a, b) => {
    return b.total - a.total;
  });
  return allCandidates;
};

export const getAllReferenda = async (): Promise<any> => {
  const referenda = await queries.getAllReferenda();
  return referenda;
};

export const getReferendum = async (index): Promise<any> => {
  const referendum = await queries.getReferendum(Number(index));
  return referendum;
};

export const getLastReferendum = async (): Promise<any> => {
  const referendum = (await queries.getLastReferenda())[0];
  return referendum;
};

export const getLastReferendums = async (): Promise<any> => {
  const referendum = await queries.getLastReferenda();
  return referendum;
};

export const getReferendumIndexVotes = async (index): Promise<any> => {
  const referendum = await queries.getVoteReferendumIndex(Number(index));
  return referendum;
};

export const getReferendumAccountVotes = async (address): Promise<any> => {
  const referendum = await queries.getAccountVoteReferendum(address);
  return referendum;
};

export const getDelegations = async (address): Promise<any> => {
  const delegations = await queries.getDelegations(address);
  return delegations;
};

export const getAllDelegations = async (): Promise<any> => {
  const delegations = await queries.getAllDelegations();
  return delegations;
};
