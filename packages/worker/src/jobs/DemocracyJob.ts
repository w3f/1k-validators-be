import { logger, ChainData, Types, queries } from "@1kv/common";
import { ConvictionVote } from "@1kv/common/build/types";
import { allCandidates } from "@1kv/common/build/db";

export const democracyLabel = { label: "DemocracyJob" };

export const democracyJob = async (chaindata: ChainData) => {
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

    const referendum: Types.Referendum = {
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

    await queries.setReferendum(referendum, latestBlockNumber, latestBlockHash);

    // Go through all votes for the referendum and update db entries for them
    for (const v of votes) {
      // @ts-ignore
      const { accountId, isDelegating, initialU8aLength, vote, balance } = v;
      // @ts-ignore
      const { vote: voteDirection, conviction } = vote.toHuman();

      const referendumVote: Types.ReferendumVote = {
        referendumIndex: index.toNumber(),
        accountId: accountId.toString(),
        isDelegating: isDelegating,
        balance: parseFloat(balance.toString()) / denom,
        voteDirection: voteDirection,
        conviction: conviction,
      };

      await queries.setReferendumVote(
        referendumVote,
        latestBlockNumber,
        latestBlockHash
      );
    }
  }

  const trackTypes = await chaindata.getTrackInfo();
  // TODO: store track types

  const convictionVoting = await chaindata.getConvictionVoting();
  const { votes, delegations } = convictionVoting;
  for (const vote of votes) {
    await queries.setConvictionVote(vote, latestBlockNumber);
  }
  const candidates = await allCandidates();
  for (const candidate of candidates) {
    await queries.updateCandidateConvictionVotes(candidate.stash);
  }

  const endTime = Date.now();

  logger.info(`Done. Took ${(endTime - start) / 1000} seconds`, democracyLabel);
};

export const processDemocracyJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Democracy Job....`, democracyLabel);
  await democracyJob(chaindata);
};
