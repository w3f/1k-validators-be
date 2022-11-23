import { logger, queries, ChainData } from "@1kv/common";

export const councilLabel = { label: "CouncilJob" };

export const councilJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const session = await chaindata.getSession();

  const candidates = await queries.allCandidates();
  // An array of all candidate stashes
  const candidateAddresses = candidates.map((candidate) => {
    return candidate.stash;
  });

  // Get all the votes of everyone in the network that backs a council member
  const councilVoting = await chaindata.getCouncilVoting();
  for (const vote of councilVoting) {
    const isCandidate = candidateAddresses.includes(vote.who.toString());
    if (isCandidate) {
      queries.setCouncilBacking(vote.who.toString(), vote.stake, vote.votes);
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
  await queries.setElectionStats(
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
      await queries.setCouncillor(address.toString(), "Member", totalBacking);
    }
  }

  // Update runners up
  if (totalRunnersUp) {
    for (const member of electionsInfo.runnersUp) {
      const { address, totalBacking } = member;
      await queries.setCouncillor(
        address.toString(),
        "Runner Up",
        totalBacking
      );
    }
  }

  // update candidates
  if (totalCandidates) {
    for (const member of electionsInfo.candidates) {
      const { address, totalBacking } = member;
      await queries.setCouncillor(
        address.toString(),
        "Candidate",
        totalBacking
      );
    }
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, councilLabel);
};

export const processCouncilJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Council Job....`, councilLabel);
  await councilJob(chaindata);
};
