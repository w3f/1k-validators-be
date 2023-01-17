import { ChainData, logger, queries, Types } from "@1kv/common";
import { OpenGovReferendumStat } from "@1kv/common/build/types";

export const democracyLabel = { label: "DemocracyJob" };

export const getNominatorAddresses = async (chaindata) => {
  return await chaindata.getNominatorAddresses();
};

export const getFellowshipAddresses = async (chaindata) => {
  const fellowship = await chaindata.getFellowship();
  const fellowshipAddresses = [];
  for (const fellow of fellowship) {
    fellowshipAddresses.push(fellow.address);
  }
  return fellowshipAddresses;
};

export const getIdentityAddresses = async () => {
  const allIdentityAddresses = [];
  const identities = await queries.getAllIdentities();
  for (const id of identities) {
    allIdentityAddresses.push(id.address);
    for (const subid of id.subIdentities) {
      allIdentityAddresses.push(subid.address);
    }
  }
  return allIdentityAddresses;
};

export const getValidatorAddresses = async (chaindata) => {
  const allValidators = [];
  const chainValidators = await chaindata.getAssociatedValidatorAddresses();
  for (const [index, validator] of chainValidators.entries()) {
    allValidators.push(validator);
    const identity = await queries.getIdentity(validator);
    if (identity) {
      if (!allValidators.includes(identity.address)) {
        allValidators.push(identity.address.toString());
      }

      for (const subidentity of identity.subIdentities) {
        if (!allValidators.includes(subidentity.address)) {
          allValidators.push(subidentity.address.toString());
        }
      }
    }
  }
  return allValidators;
};

export const getBalanceVotes = (votes) => {
  const elbThreshold = 0.5;
  const vlbThreshold = 1.5;
  const lbThreshold = 5;
  const mbThreshold = 10;
  const hbThreshold = 50;

  const elbVotes = votes.filter((vote) => {
    const totalBalance =
      vote?.balance?.aye + vote?.balance?.nay + vote?.balance?.abstain;
    if (totalBalance < elbThreshold) return true;
  });
  const vlbVotes = votes.filter((vote) => {
    const totalBalance =
      vote?.balance?.aye + vote?.balance?.nay + vote?.balance?.abstain;
    if (totalBalance > elbThreshold && totalBalance <= vlbThreshold)
      return true;
  });
  const lbVotes = votes.filter((vote) => {
    const totalBalance =
      vote?.balance?.aye + vote?.balance?.nay + vote?.balance?.abstain;
    if (totalBalance > vlbThreshold && totalBalance <= lbThreshold) return true;
  });
  const mbVotes = votes.filter((vote) => {
    const totalBalance =
      vote?.balance?.aye + vote?.balance?.nay + vote?.balance?.abstain;
    if (totalBalance > lbThreshold && totalBalance <= mbThreshold) return true;
  });
  const hbVotes = votes.filter((vote) => {
    const totalBalance =
      vote?.balance?.aye + vote?.balance?.nay + vote?.balance?.abstain;
    if (totalBalance > mbThreshold) return true;
  });

  return {
    total: votes.length,
    elb: elbVotes.length,
    vlb: vlbVotes.length,
    lb: lbVotes.length,
    mb: mbVotes.length,
    hb: hbVotes.length,
  };
};

export const getValidatorVotes = (validators, votes) => {
  return votes.filter((vote) => {
    return validators.includes(vote.address);
  });
};

export const getCastingVotes = (votes) => {
  return votes.filter((vote) => {
    return vote.voteType == "Casting";
  });
};

export const getDelegatingVotes = (votes) => {
  return votes.filter((vote) => {
    return vote.voteType == "Delegating";
  });
};

export const getAyeVotes = (votes) => {
  return votes.filter((vote) => {
    return vote.voteDirection == "Aye";
  });
};

export const getNayVotes = (votes) => {
  return votes.filter((vote) => {
    return vote.voteDirection == "Nay";
  });
};

export const getAbstainVotes = (votes) => {
  return votes.filter((vote) => {
    return vote.voteDirection == "Abstain";
  });
};

export const getIdentityVotes = (identities, votes) => {
  return votes.filter((vote) => {
    return identities.includes(vote.address);
  });
};

export const getNominatorVotes = (nominators, validators, votes) => {
  return votes.filter((vote) => {
    return (
      !validators.includes(vote.address) && nominators.includes(vote.address)
    );
  });
};

export const getNonStakerVotes = (nominators, validators, votes) => {
  return votes.filter((vote) => {
    return (
      !validators.includes(vote.address) && !nominators.includes(vote.address)
    );
  });
};

export const getFellowshipVotes = (fellowship, votes) => {
  return votes.filter((vote) => {
    return fellowship.includes(vote.address);
  });
};

export const getAmount = (votes) => {
  const ayeVotes = getAyeVotes(votes);
  const nayVotes = getNayVotes(votes);
  const abstainVotes = getAbstainVotes(votes);
  let ayeAmount = 0;
  let nayAmount = 0;
  let abstainAmount = 0;
  for (const vote of ayeVotes) {
    ayeAmount += vote.balance.aye;
  }
  for (const vote of nayVotes) {
    nayAmount += vote.balance.nay;
  }
  for (const vote of abstainVotes) {
    abstainAmount += vote.balance.abstain;
  }
  return {
    ayeAmount: ayeAmount,
    nayAmount: nayAmount,
    abstainAmount: abstainAmount,
  };
};

export const democracyStatsJob = async (chaindata) => {
  const validators = await getValidatorAddresses(chaindata);
  const nominators = await getNominatorAddresses(chaindata);
  const fellowshipAddresses = await getFellowshipAddresses(chaindata);
  const identityAddresses = await getIdentityAddresses();

  const votes = await queries.getAllConvictionVoting();
  const totalVotes = votes.length;

  const referenda = await queries.getAllOpenGovReferenda();
  for (const referendum of referenda) {
    const { track, index, origin, ayes, nays, currentStatus } = referendum;
    const votes = await queries.getReferendumConvictionVoting(index);

    const amounts = getAmount(votes);
    const ayeVotes = getAyeVotes(votes);
    const nayVotes = getNayVotes(votes);
    const abstainVotes = getAbstainVotes(votes);
    const castingVotes = getCastingVotes(votes);
    const delegatingVotes = getDelegatingVotes(votes);
    const validatorVotes = getValidatorVotes(validators, votes);
    const nominatorVotes = getNominatorVotes(nominators, validators, votes);
    const nonStakerVotes = getNonStakerVotes(nominators, validators, votes);
    const fellowshipVotes = getFellowshipVotes(fellowshipAddresses, votes);
    const identityVotes = getIdentityVotes(identityAddresses, votes);
    const referendumStats: OpenGovReferendumStat = {
      index: index,
      track: track,
      origin: origin,
      currentStatus: currentStatus,
      ayeAmount: amounts.ayeAmount,
      nayAmount: amounts.nayAmount,
      abstainAmount: amounts.abstainAmount,
      castingVoters: getBalanceVotes(castingVotes),
      delegatingVoters: getBalanceVotes(delegatingVotes),
      ayeVoters: getBalanceVotes(ayeVotes),
      nayVoters: getBalanceVotes(nayVotes),
      abstainVoters: getBalanceVotes(abstainVotes),
      validatorVoters: getBalanceVotes(validatorVotes),
      nominatorVoters: getBalanceVotes(nominatorVotes),
      nonStakerVoters: getBalanceVotes(nonStakerVotes),
      fellowshipVoters: getBalanceVotes(fellowshipVotes),
      identityVoters: getBalanceVotes(identityVotes),
      allVoters: getBalanceVotes(votes),
    };
    await queries.setOpenGovReferendumStats(referendumStats);
  }
};

export const democracyJob = async (chaindata: ChainData) => {
  const start = Date.now();
  logger.info(`Starting Democracy Job`, democracyLabel);
  await democracyStatsJob(chaindata);

  const latestBlockNumber = await chaindata.getLatestBlock();
  const latestBlockHash = await chaindata.getLatestBlockHash();
  const denom = await chaindata.getDenom();

  const sr = Date.now();
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
  const sr2 = Date.now();
  logger.info(
    `Derived Referenda Done. Took ${(sr2 - sr) / 1000} seconds`,
    democracyLabel
  );

  const chainType = await chaindata.getChainType();
  if (chainType == "Kusama") {
    try {
      const qstart = Date.now();
      const { ongoingReferenda, finishedReferenda } =
        await chaindata.getOpenGovReferenda();
      for (const referenda of ongoingReferenda) {
        await queries.setOpenGovReferendum(
          referenda,
          latestBlockNumber,
          latestBlockHash
        );
      }
      for (const referenda of finishedReferenda) {
        await queries.setOpenGovReferendum(
          referenda,
          latestBlockNumber,
          latestBlockHash
        );
      }
      const qend = Date.now();
      logger.info(
        `Open Gov Referenda Done. Took ${(qend - qstart) / 1000} seconds`,
        democracyLabel
      );

      const trackTypes = await chaindata.getTrackInfo();
      // TODO: store track types

      const cstart = Date.now();
      const convictionVoting = await chaindata.getConvictionVoting();
      const cend = Date.now();
      logger.info(
        `Conviction Voting Done. Took ${(cend - cstart) / 1000} seconds`,
        democracyLabel
      );

      const vstart = Date.now();
      const { finishedVotes, ongoingVotes, delegations } = convictionVoting;
      for (const vote of finishedVotes) {
        await queries.setConvictionVote(vote, latestBlockNumber);

        // Try to set the identity
        const identityExists = await queries.getIdentity(vote.address);
        if (!identityExists) {
          const identity = await chaindata.getFormattedIdentity(vote.address);
          await queries.setIdentity(identity);
        }
      }
      const vend = Date.now();
      logger.info(
        `Done setting finished Votes and Identities. Took ${
          (vend - vstart) / 1000
        } seconds`,
        democracyLabel
      );

      const vstart2 = Date.now();
      for (const vote of ongoingVotes) {
        await queries.setConvictionVote(vote, latestBlockNumber);

        // Try to set the identity
        const identityExists = await queries.getIdentity(vote.address);
        if (!identityExists) {
          const identity = await chaindata.getFormattedIdentity(vote.address);
          await queries.setIdentity(identity);
        }
      }

      const vend2 = Date.now();
      logger.info(
        `Done setting ongoing Votes and Identities. Took ${
          (vend2 - vstart2) / 1000
        } seconds`,
        democracyLabel
      );

      const canstart = Date.now();
      const candidates = await queries.allCandidates();
      for (const candidate of candidates) {
        await queries.updateCandidateConvictionVotes(candidate.stash);
      }
      const canend = Date.now();
      logger.info(
        `Setting Votes and Identities. Took ${
          (canend - canstart) / 1000
        } seconds`,
        democracyLabel
      );
    } catch (e) {
      logger.warn(`could not query open gov data`, democracyLabel);
      logger.error(JSON.stringify(e));
    }
  }

  const endTime = Date.now();

  logger.info(`Done. Took ${(endTime - start) / 1000} seconds`, democracyLabel);
};

export const processDemocracyJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Democracy Job....`, democracyLabel);
  await democracyJob(chaindata);
};
