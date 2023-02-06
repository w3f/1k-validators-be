// Sets a Referendum record in the db
import {
  ConvictionDelegation,
  ConvictionVote,
  OpenGovReferendum,
  OpenGovReferendumStat,
  Referendum,
  ReferendumVote,
} from "../../types";
import {
  CandidateModel,
  ConvictionVoteModel,
  OpenGovDelegationModel,
  OpenGovReferendumModel,
  OpenGovReferendumStatsModel,
  ReferendumModel,
  ReferendumVoteModel,
} from "../models";
import { getIdentity, getIdentityAddresses } from "./Candidate";
import { logger } from "../../index";

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
      balance: {
        aye: Number(convictionVote.balance?.aye)
          ? Number(convictionVote.balance?.aye)
          : 0,
        nay: Number(convictionVote.balance?.nay)
          ? Number(convictionVote.balance?.nay)
          : 0,
        abstain: Number(convictionVote.balance?.abstain)
          ? Number(convictionVote.balance?.abstain)
          : 0,
      },
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
        balance: {
          aye: Number(convictionVote.balance?.aye)
            ? Number(convictionVote.balance?.aye)
            : 0,
          nay: Number(convictionVote.balance?.nay)
            ? Number(convictionVote.balance?.nay)
            : 0,
          abstain: Number(convictionVote.balance?.abstain)
            ? Number(convictionVote.balance?.abstain)
            : 0,
        },
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

export const getAddressReferendumConvictionVoting = async (
  address: string,
  index: number
) => {
  const convictionVote = await ConvictionVoteModel.findOne({
    address: address,
    referendumIndex: index,
  })
    .select({
      _id: 0,
      balance: 1,
      address: 1,
      conviction: 1,
      voteDirection: 1,
      voteType: 1,
      delegatedTo: 1,
    })
    .lean()
    .exec();
  return convictionVote;
};

// Gets all conviction votes for a given referendum
export const getReferendumConvictionVoting = async (
  referendumIndex: number
) => {
  // logger.info(
  const convictionVotes = await ConvictionVoteModel.find({
    referendumIndex: referendumIndex,
  })
    .lean()
    .exec();
  return convictionVotes;
};

export const getAllConvictionVoting = async () => {
  const convictionVotes = await ConvictionVoteModel.find({}).lean().exec();
  return convictionVotes;
};

// Gets all the conviction votes for a given identity set
export const getIdentityConvictionVoting = async (address: string) => {
  const votes = [];
  // the list of identities associated with a given address
  const identities = await getIdentityAddresses(address);
  if (identities.length == 0) {
    const identity = await getIdentity(address);
    const votes = await getAddressConvictionVoting(address);
    return {
      identity: identity,
      votes: votes.sort((a, b) => a.referendumIndex - b.referendumIndex),
    };
  } else {
    for (const identity of identities) {
      const addressVotes = await getAddressConvictionVoting(identity);
      for (const addressVote of addressVotes) {
        votes.push(addressVote);
      }
    }
    const identity = await getIdentity(address);
    return {
      identity,
      votes: votes.sort((a, b) => a.referendumIndex - b.referendumIndex),
    };
  }
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
      currentStatus: openGovReferendum.currentStatus,
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
      currentStatus: openGovReferendum.currentStatus,
      updatedTimestamp: Date.now(),
    }
  ).exec();
};

export const getOpenGovReferendumStats = async (
  index: number
): Promise<any> => {
  const data = await OpenGovReferendumStatsModel.findOne({
    index: index,
  }).lean();
  return data;
};

export const getAllOpenGovReferendumStats = async (): Promise<any> => {
  const data = await OpenGovReferendumStatsModel.find({})
    .select({
      index: 1,
      track: 1,
      origin: 1,
      abstainAmount: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      castingVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      delegatingVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      ayeVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      nayVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      abstainVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      validatorVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      nominatorVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      nonStakerVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      fellowshipVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      societyVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      identityVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
      allVoters: {
        amount: 1,
        total: 1,
        groupSize: 1,
      },
    })
    .lean()
    .exec();
  return data;
};

export const getSegmentOpenGovReferendumStats = async (
  index: number,
  segment: string
): Promise<any> => {
  const isAbstain = segment == "abstain";
  const isAye = segment == "aye";
  const isNay = segment == "nay";
  const isCasting = segment == "casting";
  const isDelegating = segment == "delegating";
  const isValidator = segment == "validator";
  const isNominator = segment == "nominator";
  const isNonStaker = segment == "nonStaker";
  const isFellowship = segment == "fellowship";
  const isSociety = segment == "society";
  const isIdentity = segment == "identity";
  const isAll = segment == "all";
  const data = await OpenGovReferendumStatsModel.findOne({ index: index })
    .select({
      index: 1,
      track: 1,
      origin: 1,
      ...(isAbstain && {
        abstainVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isCasting && {
        castingVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isDelegating && {
        delegatingVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isAye && {
        ayeVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isNay && {
        nayVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isValidator && {
        validatorVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isNominator && {
        nominatorVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isNonStaker && {
        nonStakerVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isFellowship && {
        fellowshipVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isSociety && {
        societyVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isIdentity && {
        identityVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
      ...(isAll && {
        allVoters: {
          amount: 1,
          total: 1,
          groupSize: 1,
          elb: 1,
          vlb: 1,
          lb: 1,
          mb: 1,
          hb: 1,
          addresses: 1,
        },
      }),
    })
    .lean()
    .exec();
  if (!data) return;
  let voters;
  if (isAbstain) {
    voters = data.abstainVoters;
  } else if (isAye) {
    voters = data.ayeVoters;
  } else if (isNay) {
    voters = data.nayVoters;
  } else if (isCasting) {
    voters = data.castingVoters;
  } else if (isDelegating) {
    voters = data.delegatingVoters;
  } else if (isValidator) {
    voters = data.validatorVoters;
  } else if (isNominator) {
    voters = data.nominatorVoters;
  } else if (isNonStaker) {
    voters = data.nonStakerVoters;
  } else if (isFellowship) {
    voters = data.fellowshipVoters;
  } else if (isSociety) {
    voters = data.societyVoters;
  } else if (isIdentity) {
    voters = data.identityVoters;
  } else if (isAll) {
    voters = data.allVoters;
  }
  return {
    index: data.index,
    origin: data.origin,
    track: data.track,
    voters: voters,
  };
};

export const setOpenGovReferendumStats = async (
  referendum: OpenGovReferendumStat
): Promise<any> => {
  // Try and find an existing record
  const data = await OpenGovReferendumStatsModel.findOne({
    index: referendum.index,
  }).lean();

  // If an referendum object doesnt yet exist
  if (!data) {
    const referendumStatsData = new OpenGovReferendumStatsModel({
      index: referendum.index,
      track: referendum.track,
      origin: referendum.origin,
      currentStatus: referendum.currentStatus,
      castingVoters: referendum.castingVoters,
      delegatingVoters: referendum.delegatingVoters,
      ayeVoters: referendum.ayeVoters,
      nayVoters: referendum.nayVoters,
      abstainVoters: referendum.abstainVoters,
      validatorVoters: referendum.validatorVoters,
      nominatorVoters: referendum.nominatorVoters,
      nonStakerVoters: referendum.nonStakerVoters,
      fellowshipVoters: referendum.fellowshipVoters,
      societyVoters: referendum.societyVoters,
      identityVoters: referendum.identityVoters,
      allVoters: referendum.allVoters,
    });
    return referendumStatsData.save();
  }

  // It exists, update it
  await OpenGovReferendumStatsModel.findOneAndUpdate(
    {
      index: referendum.index,
    },
    {
      track: referendum.track,
      origin: referendum.origin,
      currentStatus: referendum.currentStatus,
      castingVoters: referendum.castingVoters,
      delegatingVoters: referendum.delegatingVoters,
      ayeVoters: referendum.ayeVoters,
      nayVoters: referendum.nayVoters,
      abstainVoters: referendum.abstainVoters,
      validatorVoters: referendum.validatorVoters,
      nominatorVoters: referendum.nominatorVoters,
      nonStakerVoters: referendum.nonStakerVoters,
      fellowshipVoters: referendum.fellowshipVoters,
      societyVoters: referendum.societyVoters,
      identityVoters: referendum.identityVoters,
      allVoters: referendum.allVoters,
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
  const referenda = await OpenGovReferendumModel.find({}).lean().exec();
  return referenda.sort((a, b) => b.index - a.index);
};

// LEGACY DEMOCRACY
// Retrieves the last referenda (by index)
export const getLastOpenGovReferenda = async (): Promise<any> => {
  return await OpenGovReferendumModel.find({}).lean().sort("-index").exec();
};

export const wipeOpenGovDelegations = async () => {
  const allDelegates = await OpenGovDelegationModel.find({ delegate: /.*/ })
    .lean()
    .exec();
  if (!allDelegates.length) {
    // nothing to do
    return true;
  }
  for (const del of allDelegates) {
    const { delegate, track } = del;
    await OpenGovDelegationModel.findOneAndUpdate(
      {
        delegate: delegate,
        track: track,
      },
      {
        totalBalance: 0,
        delegatorCount: 0,
        delegators: [],
        updated: Date.now(),
      }
    );
  }
  return true;
};

export const getAllOpenGovDelegations = async () => {
  return await OpenGovDelegationModel.find({}).lean().exec();
};

export const getOpenGovDelegation = async (address, track) => {
  return await OpenGovDelegationModel.find({ delegate: address, track: track })
    .lean()
    .exec();
};

export const getLargestOpenGovDelegationAddress = async (address) => {
  const delegations = [];
  const identities = await getIdentityAddresses(address);
  if (identities.length == 0) {
    const dels = await OpenGovDelegationModel.find({ delegate: address })
      .lean()
      .exec();
    for (const delegation of dels) {
      delegations.push(delegation);
    }
  } else {
    for (const identity of identities) {
      const dels = await OpenGovDelegationModel.find({ delegate: identity })
        .lean()
        .exec();
      for (const delegation of dels) {
        delegations.push(delegation);
      }
    }
  }

  if (delegations.length == 0) {
    return {
      track: "None",
      totalBalance: 0,
      delegatorCount: 0,
    };
  } else {
    const maxDelegation = await delegations.reduce((prev, current) =>
      prev.totalBalance > current.totalBalance ? prev : current
    );
    return {
      track: maxDelegation.track,
      totalBalance: maxDelegation.totalBalance,
      delegatorCount: maxDelegation.delegatorCount,
    };
  }
};

export const getOpenGovDelegationAddress = async (address) => {
  const delegations = [];
  const identities = await getIdentityAddresses(address);
  if (identities.length == 0) {
    const dels = await OpenGovDelegationModel.find({ delegate: address })
      .lean()
      .exec();
    for (const delegation of dels) {
      delegations.push(delegation);
    }
  } else {
    for (const identity of identities) {
      const dels = await OpenGovDelegationModel.find({ delegate: identity })
        .lean()
        .exec();
      for (const delegation of dels) {
        delegations.push(delegation);
      }
    }
  }
  return delegations.sort((a, b) => b.totalBalance - a.totalBalance);
};

export const getOpenGovDelegationTrack = async (track) => {
  return await OpenGovDelegationModel.find({ track: track }).lean().exec();
};

export const addOpenGovDelegation = async (
  delegation: ConvictionDelegation
) => {
  const delegator = {
    address: delegation.address,
    balance: delegation.balance,
    effectiveBalance: delegation.effectiveBalance,
    conviction: delegation.conviction,
  };

  // Try to find the delegate
  const data = await OpenGovDelegationModel.findOne({
    delegate: delegation.target,
    track: delegation.track,
  });

  // There isn't any delegate data, add a record
  if (!data) {
    const delegate = await new OpenGovDelegationModel({
      delegate: delegation.target,
      track: delegation.track,
      totalBalance: delegation.effectiveBalance,
      delegatorCount: 1,
      delegators: [delegator],
      updated: Date.now(),
    });
    return await delegate.save();
  }

  // If the delegate exists and doesn't have the current delegator, add it and update
  if (data && !data.delegators?.includes(delegator)) {
    await OpenGovDelegationModel.findOneAndUpdate(
      {
        delegate: delegation.target,
        track: delegation.track,
      },
      {
        totalBalance: data.totalBalance + delegation.effectiveBalance,
        $push: {
          delegators: delegator,
        },
        $inc: { delegatorCount: 1 },
        updated: Date.now(),
      }
    );
  }
};
