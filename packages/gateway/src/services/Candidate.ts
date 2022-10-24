import { queries, Config, logger } from "@1kv/common";
import { BaseContext } from "koa";

export const getCandidate = async (stash: any): Promise<any> => {
  let candidate;

  try {
    candidate = await queries.getCandidate(stash);
    if (candidate && candidate.stash) {
      const score = await queries.getLatestValidatorScore(candidate.stash);
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
        queuedKeys: candidate.queuedKeys,
        nextKeys: candidate.nextKeys,
        stash: candidate.stash,
        rewardDestination: candidate.rewardDestination,
        controller: candidate.controller,
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
        matrix: candidate.matrix,
      };
    }
  } catch (error) {
    logger.error("findCandidate", { error });
  }

  return candidate;
};

export const getCandidates = async (): Promise<any> => {
  let allCandidates = await queries.allCandidates();
  allCandidates = await Promise.all(
    allCandidates.map(async (candidate) => {
      const score = await queries.getLatestValidatorScore(candidate.stash);
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
        matrix: candidate.matrix,
      };
    })
  );
  allCandidates = allCandidates.sort((a, b) => {
    return b.total - a.total;
  });
  return allCandidates;
};

export const getNodes = async (): Promise<any> => {
  const allNodes: Array<any> = await queries.allNodes();
  return allNodes;
};

export const getNominatorStake = async (address): Promise<any> => {
  const stake = await queries.getLatestNominatorStake(address);
  return stake;
};
