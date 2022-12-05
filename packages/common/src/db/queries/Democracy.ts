// Sets a Referendum record in the db
import {
  ConvictionVote,
  OpenGovReferendum,
  Referendum,
  ReferendumVote,
} from "../../types";
import {
  CandidateModel,
  ConvictionVoteModel,
  OpenGovReferendumModel,
  ReferendumModel,
  ReferendumVoteModel,
} from "../models";
import { getIdentity, getIdentityAddresses } from "./Candidate";

// LEGACY DEMOCRACY
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

// LEGACY DEMOCRACY
// returns a referendum by index
export const getReferendum = async (index: number): Promise<any> => {
  const data = await ReferendumModel.findOne({
    referendumIndex: index,
  }).lean();
  return data;
};

// LEGACY DEMOCRACY
// returns a referendum by index
export const getAllReferenda = async (): Promise<any> => {
  return ReferendumModel.find({}).lean().exec();
};

// LEGACY DEMOCRACY
// Retrieves the last referenda (by index)
export const getLastReferenda = async (): Promise<any> => {
  return await ReferendumModel.find({}).lean().sort("-referendumIndex").exec();
};

// LEGACY DEMOCRACY
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

// LEGACY DEMOCRACY
// returns all votes for a referendum by index
export const getVoteReferendumIndex = async (index: number): Promise<any> => {
  return ReferendumVoteModel.find({ referendumIndex: index }).lean().exec();
};

// LEGACY DEMOCRACY
// returns all votes for a referendum by account
export const getAccountVoteReferendum = async (
  accountId: string
): Promise<any> => {
  return ReferendumVoteModel.find({ accountId: accountId }).lean().exec();
};

export const updateCandidateConvictionVotes = async (
  address: string
): Promise<any> => {
  const candidate = await CandidateModel.findOne({
    stash: address,
  }).lean();
  if (candidate) {
    await CandidateModel.findOneAndUpdate(
      {
        stash: address,
      },
      {
        convictionVotes: [],
        convictionVoteCount: 0,
      }
    );

    const identityVotes = await getIdentityConvictionVoting(address);
    for (const vote of identityVotes?.votes) {
      const candidateConvictionVotes = await CandidateModel.findOne({
        stash: address,
      })
        .lean()
        .select({ convictionVotes: 1 });
      if (
        !candidateConvictionVotes?.convictionVotes?.includes(
          vote.referendumIndex
        )
      ) {
        await CandidateModel.findOneAndUpdate(
          {
            stash: address,
          },
          {
            $push: {
              convictionVotes: vote.referendumIndex,
            },
            $inc: { convictionVoteCount: 1 },
          }
        );
      }
    }
  }
};

// Sets an OpenGov Conviction Vote
export const setConvictionVote = async (
  convictionVote: ConvictionVote,
  updatedBlockNumber: number
): Promise<any> => {
  // Try and find an existing conviction vote for an address for the given referendum
  const data = await ConvictionVoteModel.findOne({
    address: convictionVote.address,
    referendumIndex: convictionVote.referendumIndex,
  });

  // If a conviction vote doesn't exist yet
  if (!data) {
    // create the conviciton vote record
    const convictionVoteData = new ConvictionVoteModel({
      track: convictionVote.track,
      address: convictionVote.address,
      referendumIndex: convictionVote.referendumIndex,
      conviction: convictionVote.conviction,
      balance: convictionVote.balance,
      delegatedConvictionBalance: convictionVote.delegatedConvictionBalance,
      delegatedBalance: convictionVote.delegatedBalance,
      voteDirection: convictionVote.voteDirection,
      voteType: convictionVote.voteType,
      delegatedTo: convictionVote.delegatedTo,
      updatedBlockNumber,
    });
    return await convictionVoteData.save();
  }

  // Only update if the new vote data is of a higher block than the existing data
  if (data.updatedBlockNumber && updatedBlockNumber > data.updatedBlockNumber) {
    await ConvictionVoteModel.findOneAndUpdate(
      {
        address: convictionVote.address,
        referendumIndex: convictionVote.referendumIndex,
      },
      {
        track: convictionVote.track,
        conviction: convictionVote.conviction,
        balance: convictionVote.balance,
        delegatedConvictionBalance: convictionVote.delegatedConvictionBalance,
        delegatedBalance: convictionVote.delegatedBalance,
        voteDirection: convictionVote.voteDirection,
        voteType: convictionVote.voteType,
        delegatedTo: convictionVote.delegatedTo,
        updatedBlockNumber,
      }
    );
  }
};

// Gets all conviction votes for a given address
export const getAddressConvictionVoting = async (address: string) => {
  const convictionVotes = await ConvictionVoteModel.find({ address: address });
  return convictionVotes;
};

// Gets all conviction votes for a given track
export const getTrackConvictionVoting = async (track: number) => {
  const convictionVotes = await ConvictionVoteModel.find({ track: track });
  return convictionVotes;
};

// Gets all conviction votes for a given address for a given track
export const getAddressTrackConvictionVoting = async (
  address: string,
  track: number
) => {
  const convictionVotes = await ConvictionVoteModel.find({
    address: address,
    track: track,
  });
  return convictionVotes;
};

// Gets all conviction votes for a given referendum
export const getReferendumConvictionVoting = async (
  referendumIndex: number
) => {
  // logger.info(
  const convictionVotes = await ConvictionVoteModel.find({
    referendumIndex: referendumIndex,
  });
  return convictionVotes;
};

// Gets all the conviction votes for a given identity set
export const getIdentityConvictionVoting = async (address: string) => {
  const votes = [];
  // the list of identities associated with a given address
  const identities = await getIdentityAddresses(address);
  for (const identity of identities) {
    const addressVotes = await getAddressConvictionVoting(identity);
    for (const addressVote of addressVotes) {
      votes.push(addressVote);
    }
  }
  const identity = await getIdentity(address);
  return { identity, votes };
};

export const setOpenGovReferendum = async (
  openGovReferendum: OpenGovReferendum,
  updatedBlockNumber: number,
  updatedBlockHash: string
): Promise<any> => {
  // Try and find an existing record
  const data = await OpenGovReferendumModel.findOne({
    index: openGovReferendum.index,
  }).lean();

  // If an referendum object doesnt yet exist
  if (!data) {
    const referendumData = new OpenGovReferendumModel({
      index: openGovReferendum.index,
      track: openGovReferendum.track,
      origin: openGovReferendum.origin,
      proposalHash: openGovReferendum.proposalHash,
      enactmentAfter: openGovReferendum.enactmentAfter,
      submitted: openGovReferendum.submitted,
      submissionWho: openGovReferendum.submissionWho,
      submissionAmount: openGovReferendum.submissionAmount,
      decisionDepositWho: openGovReferendum.decisionDepositWho,
      decisionDepositAmount: openGovReferendum.decisionDepositAmount,
      decidingSince: openGovReferendum.decidingSince,
      decidingConfirming: openGovReferendum.decidingConfirming,
      ayes: openGovReferendum.ayes,
      nays: openGovReferendum.nays,
      support: openGovReferendum.support,
      inQueue: openGovReferendum.inQueue,
      updatedBlockNumber: updatedBlockNumber,
      updatedBlockHash: updatedBlockHash,
      updatedTimestamp: Date.now(),
    });
    return referendumData.save();
  }

  // It exists, update it
  await OpenGovReferendumModel.findOneAndUpdate(
    {
      index: openGovReferendum.index,
    },
    {
      track: openGovReferendum.track,
      origin: openGovReferendum.origin,
      proposalHash: openGovReferendum.proposalHash,
      enactmentAfter: openGovReferendum.enactmentAfter,
      submitted: openGovReferendum.submitted,
      submissionWho: openGovReferendum.submissionWho,
      submissionAmount: openGovReferendum.submissionAmount,
      decisionDepositWho: openGovReferendum.decisionDepositWho,
      decisionDepositAmount: openGovReferendum.decisionDepositAmount,
      decidingSince: openGovReferendum.decidingSince,
      decidingConfirming: openGovReferendum.decidingConfirming,
      ayes: openGovReferendum.ayes,
      nays: openGovReferendum.nays,
      support: openGovReferendum.support,
      inQueue: openGovReferendum.inQueue,
      updatedBlockNumber: updatedBlockNumber,
      updatedBlockHash: updatedBlockHash,
      updatedTimestamp: Date.now(),
    }
  ).exec();
};

export const getOpenGovReferendum = async (index: number): Promise<any> => {
  const data = await OpenGovReferendumModel.findOne({
    index: index,
  }).lean();
  return data;
};

// LEGACY DEMOCRACY
// returns a referendum by index
export const getAllOpenGovReferenda = async (): Promise<any> => {
  return OpenGovReferendumModel.find({}).lean().exec();
};

// LEGACY DEMOCRACY
// Retrieves the last referenda (by index)
export const getLastOpenGovReferenda = async (): Promise<any> => {
  return await OpenGovReferendumModel.find({}).lean().sort("-index").exec();
};
