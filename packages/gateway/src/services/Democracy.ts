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
      const score = await queries.getLatestValidatorScore(candidate.stash);
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

export const getAddressConvictionVotes = async (
  address: string
): Promise<any> => {
  const convictionVotes = await queries.getIdentityConvictionVoting(address);
  return convictionVotes;
};

export const getAddressTrackConvictionVotes = async (
  address: string,
  track: number
): Promise<any> => {
  const convictionVotes = await queries.getAddressTrackConvictionVoting(
    address,
    track
  );
  return convictionVotes;
};

export const getTrackConvictionVotes = async (track: number): Promise<any> => {
  const convictionVotes = await queries.getTrackConvictionVoting(track);
  return convictionVotes;
};

export const getReferendumConvictionVotes = async (
  index: number
): Promise<any> => {
  const convictionVotes = await queries.getReferendumConvictionVoting(index);
  return convictionVotes;
};

export const getOpenGovAddressDelegations = async (
  address: string
): Promise<any> => {
  const delegations = await queries.getOpenGovDelegationAddress(address);
  return delegations;
};

export const getOpenGovVoters = async (): Promise<any> => {
  const delegations = await queries.getOpenGovVoters();
  return delegations;
};

export const getOpenGovReferenda = async (): Promise<any> => {
  const refs = await queries.getAllOpenGovReferenda();
  return refs;
};

export const getOpenGovReferendaIndex = async (index: number): Promise<any> => {
  const ref = await queries.getOpenGovReferendum(index);
  return ref;
};

export const getOpenGovReferendaStats = async (): Promise<any> => {
  const refStats = await queries.getAllOpenGovReferendumStats();
  return refStats;
};

export const getOpenGovReferendumStats = async (
  index: number
): Promise<any> => {
  const refStats = await queries.getOpenGovReferendumStats(index);
  return refStats;
};

export const getOpenGovReferendumStatsSegment = async (
  index: number,
  segment: string
): Promise<any> => {
  if (
    segment != "aye" &&
    segment != "nay" &&
    segment != "abstain" &&
    segment != "casting" &&
    segment != "delegating" &&
    segment != "validator" &&
    segment != "nominator" &&
    segment != "nonStaker" &&
    segment != "fellowship" &&
    segment != "society" &&
    segment != "identity" &&
    segment != "all"
  )
    return "Segment not found!";

  const refStats = await queries.getSegmentOpenGovReferendumStats(
    index,
    segment
  );

  const votes = await Promise.all(
    refStats.voters.addresses.map(async (vote) => {
      const identity = await queries.getIdentity(vote);
      const v = await queries.getAddressReferendumConvictionVoting(
        vote,
        refStats.index
      );
      return {
        address: v.address,
        conviction: v.conviction,
        balance: v.balance.aye + v.balance.nay + v.balance.abstain,
        direction: v.voteDirection,
        type: v.voteType,
        delegatedTo: v.delegatedTo,
        identity: identity && identity?.display ? identity?.display : vote,
      };
    })
  );
  return {
    index: refStats.index,
    track: refStats.track,
    origin: refStats.origin,
    currentStatus: refStats.currentStatus,
    amount: refStats.voters.amount,
    groupSize: refStats.voters.groupSize,
    segmentSize: refStats.voters.total,
    elb: refStats.voters.elb,
    vlb: refStats.voters.vlb,
    lb: refStats.voters.lb,
    mb: refStats.voters.mb,
    hb: refStats.voters.hb,
    votes: votes,
  };
};
