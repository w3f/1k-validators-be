// Sets a Referendum record in the db
import { Referendum, ReferendumVote } from "../../types";
import {
  CandidateModel,
  ReferendumModel,
  ReferendumVoteModel,
} from "../models";

export const setReferendum = async (
  referendum: Referendum,
  updatedBlockNumber: number,
  updatedBlockHash: string
): Promise<any> => {
  // Try and find an existing record
  const data = await ReferendumModel.findOne({
    referendumIndex: referendum.referendumIndex,
  }).lean();

  // If an referendum object doesnt yet exist
  if (!data) {
    const referendumData = new ReferendumModel({
      referendumIndex: referendum.referendumIndex,
      proposedAt: referendum.proposedAt,
      proposalEnd: referendum.proposalEnd,
      proposalDelay: referendum.proposalDelay,
      threshold: referendum.threshold,
      deposit: referendum.deposit,
      proposer: referendum.proposer,
      imageHash: referendum.imageHash,
      voteCount: referendum.voteCount,
      voteCountAye: referendum.voteCountAye,
      voteCountNay: referendum.voteCountNay,
      voteAyeAmount: referendum.voteAyeAmount,
      voteNayAmount: referendum.voteNayAmount,
      voteTotalAmount: referendum.voteTotalAmount,
      isPassing: referendum.isPassing,
      updatedBlockNumber: updatedBlockNumber,
      updatedBlockHash: updatedBlockHash,
      updatedTimestamp: Date.now(),
    });
    return referendumData.save();
  }

  // It exists, update it
  await ReferendumModel.findOneAndUpdate(
    {
      referendumIndex: referendum.referendumIndex,
    },
    {
      proposedAt: referendum.proposedAt,
      proposalEnd: referendum.proposalEnd,
      proposalDelay: referendum.proposalDelay,
      threshold: referendum.threshold,
      deposit: referendum.deposit,
      proposer: referendum.proposer,
      imageHash: referendum.imageHash,
      voteCount: referendum.voteCount,
      voteCountAye: referendum.voteCountAye,
      voteCountNay: referendum.voteCountNay,
      voteAyeAmount: referendum.voteAyeAmount,
      voteNayAmount: referendum.voteNayAmount,
      voteTotalAmount: referendum.voteTotalAmount,
      isPassing: referendum.isPassing,
      updatedBlockNumber: updatedBlockNumber,
      updatedBlockHash: updatedBlockHash,
      updatedTimestamp: Date.now(),
    }
  ).exec();
};

// returns a referendum by index
export const getReferendum = async (index: number): Promise<any> => {
  const data = await ReferendumModel.findOne({
    referendumIndex: index,
  }).lean();
  return data;
};

// returns a referendum by index
export const getAllReferenda = async (): Promise<any> => {
  return ReferendumModel.find({}).lean().exec();
};

// Retrieves the last referenda (by index)
export const getLastReferenda = async (): Promise<any> => {
  return await ReferendumModel.find({}).lean().sort("-referendumIndex").exec();
};

// Sets a Referendum record in the db
export const setReferendumVote = async (
  referendumVote: ReferendumVote,
  updatedBlockNumber: number,
  updatedBlockHash: string
): Promise<any> => {
  // Try and find an existing record
  const data = await ReferendumVoteModel.findOne({
    referendumIndex: referendumVote.referendumIndex,
    accountId: referendumVote.accountId,
  }).lean();

  // If an referendum vote object doesnt yet exist
  if (!data) {
    // create the referendum vote record
    const referendumVoteData = new ReferendumVoteModel({
      referendumIndex: referendumVote.referendumIndex,
      accountId: referendumVote.accountId,
      isDelegating: referendumVote.isDelegating,
      updatedBlockNumber: updatedBlockNumber,
      updatedBlockHash: updatedBlockHash,
      updatedTimestamp: Date.now(),
    });
    await referendumVoteData.save();

    const candidate = await CandidateModel.findOne({
      stash: referendumVote.accountId,
    }).lean();

    // If the vote was done by a candidate, add the referendum and increase the vote count
    if (
      candidate &&
      !candidate.democracyVotes?.includes(referendumVote.referendumIndex)
    ) {
      await CandidateModel.findOneAndUpdate(
        {
          stash: referendumVote.accountId,
        },
        {
          $push: {
            democracyVotes: referendumVote.referendumIndex,
          },
          $inc: { democracyVoteCount: 1 },
        }
      );
    }
  }

  // It exists, update it
  await ReferendumVoteModel.findOneAndUpdate(
    {
      referendumIndex: referendumVote.referendumIndex,
      accountId: referendumVote.accountId,
    },
    {
      isDelegating: referendumVote.isDelegating,
      updatedBlockNumber: updatedBlockNumber,
      updatedBlockHash: updatedBlockHash,
      updatedTimestamp: Date.now(),
    }
  ).exec();
};

// returns all votes for a referendum by index
export const getVoteReferendumIndex = async (index: number): Promise<any> => {
  return ReferendumVoteModel.find({ referendumIndex: index }).lean().exec();
};

// returns all votes for a referendum by account
export const getAccountVoteReferendum = async (
  accountId: string
): Promise<any> => {
  return ReferendumVoteModel.find({ accountId: accountId }).lean().exec();
};
