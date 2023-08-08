import { ChainData, logger, queries, Types } from "@1kv/common";
import { OpenGovReferendumStat } from "@1kv/common/build/types";
import {
  ConvictionVoteModel,
  OpenGovReferendumModel,
} from "@1kv/common/build/db/models";
import {
  getIdentityName,
  getOpenGovDelegationPeak,
} from "@1kv/common/build/db";
import { scaledDefined, scoreDemocracyVotes } from "@1kv/common/build/score";

export const democracyLabel = { label: "DemocracyJob" };

export const getNominatorAddresses = async (chaindata) => {
  return await chaindata.getNominatorAddresses();
};

export const getFellowshipAddresses = async (chaindata) => {
  const fellowshipAddresses = [];
  try {
    const fellowship = await chaindata.getFellowship();

    for (const fellow of fellowship) {
      fellowshipAddresses.push(fellow.address);
      const identity = await queries.getIdentity(fellow.address);
      if (identity) {
        if (!fellowshipAddresses.includes(identity.address)) {
          fellowshipAddresses.push(identity.address.toString());
        }

        for (const subidentity of identity.subIdentities) {
          if (!fellowshipAddresses.includes(subidentity.address)) {
            fellowshipAddresses.push(subidentity.address.toString());
          }
        }
      }
    }
  } catch (e) {
    logger.error(`could not get fellowship addresses`);
    logger.error(e.toString(), democracyLabel);
  }
  return fellowshipAddresses;
};

export const getSocietyAddresses = async (chaindata) => {
  const addresses = [];
  try {
    const society = await chaindata.getSociety();
    for (const address of society) {
      addresses.push(address);
      const identity = await queries.getIdentity(address);
      if (identity) {
        if (!addresses.includes(identity.address)) {
          addresses.push(identity.address.toString());
        }

        for (const subidentity of identity.subIdentities) {
          if (!addresses.includes(subidentity.address)) {
            addresses.push(subidentity.address.toString());
          }
        }
      }
    }
  } catch (e) {
    logger.error(`could not get society addresses`, democracyLabel);
    logger.error(e.toString(), democracyLabel);
  }

  return addresses;
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
  return { allValidators, chainValidators };
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

export const getSocietyVotes = (society, votes) => {
  return votes.filter((vote) => {
    return society.includes(vote.address);
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
    totalAmount: ayeAmount + nayAmount + abstainAmount,
    ayeAmount: ayeAmount,
    nayAmount: nayAmount,
    abstainAmount: abstainAmount,
  };
};

export const democracyStatsJob = async (chaindata) => {
  logger.info(`Starting democracy .stats job...`, democracyLabel);
  const start = Date.now();

  const votes = await queries.getAllConvictionVoting();
  if (votes.length == 0) return;
  try {
    const { allValidators: validators, chainValidators } =
      await getValidatorAddresses(chaindata);
    const nominators = await getNominatorAddresses(chaindata);
    const fellowshipAddresses = await getFellowshipAddresses(chaindata);
    const identityAddresses = await getIdentityAddresses();
    const societyAddresses = await getSocietyAddresses(chaindata);

    const totalVotes = votes.length;

    const referenda = await queries.getAllOpenGovReferenda();
    for (const referendum of referenda) {
      const { track, index, origin, ayes, nays, currentStatus } = referendum;
      const votes = await queries.getReferendumConvictionVoting(index);
      if (votes.length == 0) continue;

      const voteAddresses = votes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });

      const amounts = getAmount(votes);

      const ayeVotes = getAyeVotes(votes);
      const ayeVoteAddresses = ayeVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const ayeVoteAmount = ayeVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const nayVotes = getNayVotes(votes);
      const nayVoteAddresses = nayVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const nayVoteAmount = nayVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const abstainVotes = getAbstainVotes(votes);
      const abstainVoteAddresses = abstainVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const abstainVoteAmount = abstainVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const castingVotes = getCastingVotes(votes);
      const castingVoteAddresses = castingVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const castingVoteAmount = castingVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const delegatingVotes = getDelegatingVotes(votes);
      const delegatingVotesAddresses = delegatingVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const delegatingVoteAmount = delegatingVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const validatorVotes = getValidatorVotes(validators, votes);
      const validatorVoteAddresses = validatorVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const validatorVoteAmount = validatorVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const nominatorVotes = getNominatorVotes(nominators, validators, votes);
      const nominatorVoteAddresses = nominatorVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const nominatorVoteAmount = nominatorVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const nonStakerVotes = getNonStakerVotes(nominators, validators, votes);
      const nonStakerAddresses = nonStakerVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const nonStakerVoteAmount = nonStakerVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const fellowshipVotes = getFellowshipVotes(fellowshipAddresses, votes);
      const fellowshipVoteAddresses = fellowshipVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const fellowshipVoteAmount = fellowshipVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const societyVotes = getSocietyVotes(societyAddresses, votes);
      const societyVoteAddresses = societyVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const societyVoteAmount = societyVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const identityVotes = getIdentityVotes(identityAddresses, votes);
      const identityVoteAddresses = identityVotes
        .sort(
          (a, b) =>
            b.balance.aye +
            b.balance.nay +
            b.balance.abstain -
            (a.balance.aye + a.balance.nay + a.balance.abstain)
        )
        .map((vote) => {
          return vote.address;
        });
      const identityVoteAmount = identityVotes.reduce(
        (accumulator, vote) =>
          accumulator +
          vote?.balance?.aye +
          vote?.balance?.nay +
          vote?.balance?.abstain,
        0
      );

      const referendumStats: OpenGovReferendumStat = {
        index: index,
        track: track,
        origin: origin,
        currentStatus: currentStatus,
        castingVoters: {
          amount: castingVoteAmount,
          ...getBalanceVotes(castingVotes),
          groupSize: votes.length,
          addresses: castingVoteAddresses,
        },
        delegatingVoters: {
          amount: delegatingVoteAmount,
          ...getBalanceVotes(delegatingVotes),
          groupSize: votes.length,
          addresses: delegatingVotesAddresses,
        },
        ayeVoters: {
          amount: ayeVoteAmount,
          ...getBalanceVotes(ayeVotes),
          groupSize: votes.length,
          addresses: ayeVoteAddresses,
        },
        nayVoters: {
          amount: nayVoteAmount,
          ...getBalanceVotes(nayVotes),
          groupSize: votes.length,
          addresses: nayVoteAddresses,
        },
        abstainVoters: {
          amount: abstainVoteAmount,
          ...getBalanceVotes(abstainVotes),
          groupSize: votes.length,
          addresses: abstainVoteAddresses,
        },
        validatorVoters: {
          amount: validatorVoteAmount,
          ...getBalanceVotes(validatorVotes),
          groupSize: chainValidators.length,
          addresses: validatorVoteAddresses,
        },
        nominatorVoters: {
          amount: nominatorVoteAmount,
          ...getBalanceVotes(nominatorVotes),
          groupSize: nominators.length,
          addresses: nominatorVoteAddresses,
        },
        nonStakerVoters: {
          amount: nonStakerVoteAmount,
          ...getBalanceVotes(nonStakerVotes),
          groupSize: nonStakerVotes.length,
          addresses: nonStakerAddresses,
        },
        fellowshipVoters: {
          amount: fellowshipVoteAmount,
          ...getBalanceVotes(fellowshipVotes),
          groupSize: fellowshipAddresses.length,
          addresses: fellowshipVoteAddresses,
        },
        societyVoters: {
          amount: societyVoteAmount,
          ...getBalanceVotes(societyVotes),
          groupSize: societyAddresses.length,
          addresses: societyVoteAddresses,
        },
        identityVoters: {
          amount: identityVoteAmount,
          ...getBalanceVotes(identityVotes),
          groupSize: identityAddresses.length,
          addresses: identityVoteAddresses,
        },
        allVoters: {
          amount: amounts.totalAmount,
          ...getBalanceVotes(votes),
          groupSize: votes.length,
          addresses: voteAddresses,
        },
      };
      await queries.setOpenGovReferendumStats(referendumStats);
    }
  } catch (e) {
    logger.warn(`could not set referenda stats`, democracyLabel);
    logger.warn(JSON.stringify(e), democracyLabel);
  }

  const end = Date.now();
  logger.info(
    `Finished Democracy stats, took ${(end - start) / 1000}s`,
    democracyLabel
  );
};

export enum Network {
  Kusama = "Kusama",
  Polkadot = "Polkadot",
}

const referendum_posts_query = `
query getReferendum($id: Int) {
    posts(where: {onchain_link: {onchain_referendum_id: {_eq: $id}}}) {
      title
      content
      onchain_link {
          proposer_address
      }
      comments {
          content
          created_at
          author {
             username
          }
          replies {
             content
             author {
               username
            }
          }
       }
    }
  }`;

const open_referendum_posts_query = `
  query getReferendum($id: Int) {
      posts(where: {onchain_link: {onchain_referendumv2_id: {_eq: $id}}}) {
        title
        content
        onchain_link {
            proposer_address
        }
        comments(order_by: {created_at: asc}) {
            content
            created_at
            author {
               username
            }
            replies {
               content
               author {
                 username
              }
            }
         }
      }
  }`;

const networkUrl = (network: Network): string => {
  switch (network) {
    case Network.Polkadot:
      return "https://polkadot.polkassembly.io/v1/graphql";
    case Network.Kusama:
      return "https://kusama.polkassembly.io/api/v1/graphql";
  }
};

export async function fetchReferendaV1(
  network: Network,
  id: number
): Promise<any> {
  return fetchQuery(networkUrl(network), referendum_posts_query, { id: id });
}

export async function fetchReferenda(
  network: Network,
  id: number
): Promise<any> {
  let res;
  const myHeaders = new Headers();
  myHeaders.append("x-network", " kusama");

  res = await fetch(
    `https://api.polkassembly.io/api/v1/posts/on-chain-post?postId=${id}&proposalType=referendums_v2`,
    {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    }
  )
    .then((response) => response.json())
    .then((result) => {
      // console.log(result);
      res = result;
      return result;
    })
    .catch((error) => console.log("error", error));
  return res;
}

export function fetchQuery<T>(
  input: RequestInfo | URL,
  query: string,
  variables: Record<string, any> = {},
  defaultInit?: RequestInit
): Promise<T> {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables,
    }),
  };
  // logger.info(JSON.stringify(init), democracyLabel);
  return fetch(input, { ...init, ...defaultInit })
    .then((res) => res.json())
    .then((res) => res.data)
    .catch((e) => {
      logger.warn(`could not set referenda`, democracyLabel);
      logger.error(JSON.stringify(e), democracyLabel);
    });
}

// Sets a list of referenda in the database
export const setReferenda = async (
  network,
  referendaList,
  latestBlockNumber,
  latestBlockHash
) => {
  for (const [i, referenda] of referendaList.entries()) {
    try {
      const start = Date.now();
      const refQuery = await fetchReferenda(network, referenda.index);

      const title = refQuery?.title;
      const content = refQuery?.content;
      const proposedCall = refQuery?.proposed_call;

      await queries.setOpenGovReferendum(
        title,
        content,
        referenda,
        proposedCall,
        latestBlockNumber,
        latestBlockHash
      );
      const end = Date.now();

      logger.info(
        `Set contextual info for referendum ${referenda.index} [${i}/${
          referendaList.length
        }] (${(end - start) / 1000}s)`,
        democracyLabel
      );
    } catch (e) {
      logger.warn(`could not set referenda`, democracyLabel);
      logger.error(JSON.stringify(e), democracyLabel);
    }
  }
};

// Queries and sets all referenda in the database
export const queryAndSetAllReferenda = async (chaindata) => {
  try {
    const start = Date.now();
    const chainType = await chaindata.getChainType();

    const chain = chainType == "Kusama" ? Network.Kusama : Network.Polkadot;

    const latestBlockNumber = await chaindata.getLatestBlock();
    const latestBlockHash = await chaindata.getLatestBlockHash();

    const { ongoingReferenda, finishedReferenda } =
      await chaindata.getOpenGovReferenda();

    logger.info(
      `Queried open gov referenda: ${ongoingReferenda.length} ongoing referenda ${finishedReferenda.length} finished referenda`,
      democracyLabel
    );

    await setReferenda(
      chain,
      ongoingReferenda,
      latestBlockNumber,
      latestBlockHash
    );

    logger.info(
      `Finished writing ${ongoingReferenda.length} ongoing referenda`,
      democracyLabel
    );

    await setReferenda(
      chain,
      finishedReferenda,
      latestBlockNumber,
      latestBlockHash
    );

    logger.info(
      `Finished writing ${finishedReferenda.length} finished referenda`,
      democracyLabel
    );

    const end = Date.now();
    logger.info(
      `Open Gov Referenda Done. Took ${(end - start) / 1000}s`,
      democracyLabel
    );
  } catch (e) {
    logger.warn(`could not set referenda`, democracyLabel);
    logger.error(JSON.stringify(e), democracyLabel);
  }
};

export const setVoters = async (chaindata) => {
  logger.info(`Setting voters`, democracyLabel);
  const start = Date.now();
  try {
    logger.info(`Getting validators`, democracyLabel);
    const { allValidators: validators, chainValidators } =
      await getValidatorAddresses(chaindata);
    logger.info(`Getting nominators`, democracyLabel);
    const nominators = await getNominatorAddresses(chaindata);
    logger.info(`Getting fellowship`, democracyLabel);
    const fellowshipAddresses = await getFellowshipAddresses(chaindata);
    logger.info(`Getting identities`, democracyLabel);
    const identityAddresses = await getIdentityAddresses();
    logger.info(`Getting society`, democracyLabel);
    const societyAddresses = await getSocietyAddresses(chaindata);

    const voters = [];
    const convictionVotes = await ConvictionVoteModel.find({}).lean().exec();

    if (convictionVotes.length === 0) {
      logger.info(`No conviction votes found`, democracyLabel);
      return;
    }

    for (const vote of convictionVotes) {
      if (!voters.includes(vote.address)) {
        voters.push(vote.address);
      }
    }

    const latestRef = (
      await OpenGovReferendumModel.find({})
        .lean()
        .sort("-index")
        .select({ index: 1 })
        .exec()
    )[0];

    const voterList = await Promise.all(
      voters.map(async (address) => {
        const addressVotes = convictionVotes.filter((vote) => {
          if (vote.address == address) return true;
        });
        const identity = await getIdentityName(address);
        const delegations = await getOpenGovDelegationPeak(address);

        const lastVote =
          addressVotes.length > 0
            ? addressVotes.reduce(function (prev, current) {
                return prev.referendumIndex > current.referendumIndex
                  ? prev
                  : current;
              })
            : null;

        const balance =
          lastVote.balance.aye +
          lastVote.balance.nay +
          lastVote.balance.abstain;

        const votes = addressVotes
          .map((vote) => {
            return vote.referendumIndex;
          })
          .sort((a, b) => b - a);

        const isNominator = nominators.includes(address);
        const isValidator = validators.includes(address);
        const isFellowship = fellowshipAddresses.includes(address);
        const isSociety = societyAddresses.includes(address);
        const labels = [];

        if (isNominator) {
          labels.push("Nominator");
        }
        if (isValidator) {
          labels.push("Validator");
        }
        if (isFellowship) {
          labels.push("Fellowship");
        }
        if (isSociety) {
          labels.push("Society");
        }

        return {
          score: scoreDemocracyVotes(votes, latestRef.index, 1500, 30),
          address: address,
          identity: identity ? identity.name : address,
          voteCount: addressVotes.length,
          ayeCount: addressVotes.filter((vote) => {
            if (vote.voteDirection == "Aye") return true;
          }).length,
          nayCount: addressVotes.filter((vote) => {
            if (vote.voteDirection == "Nay") return true;
          }).length,
          abstainCount: addressVotes.filter((vote) => {
            if (vote.voteDirection == "Abstain") return true;
          }).length,
          castedVotes: addressVotes.filter((vote) => {
            if (vote.voteType == "Casting") return true;
          }).length,
          delegatedVotes: addressVotes.filter((vote) => {
            if (vote.voteType == "Delegating") return true;
          }).length,
          votes: votes,
          delegationCount: delegations ? delegations.delegatorCount : 0,
          // delegators: highestDelegation ? highestDelegation.delegators : [],
          delegationAmount: delegations ? delegations?.totalBalance : 0,
          votingBalance: balance,
          labels: labels,
        };
      })
    );
    const scoreValues = voterList.map((votes) => {
      return votes.score.totalDemocracyScore;
    });
    const norm = voterList.map((votes) => {
      return {
        normalizedScore:
          scaledDefined(
            votes.score.totalDemocracyScore,
            scoreValues,
            0.2,
            0.95
          ) * 100,
        ...votes,
      };
    });

    for (const voter of norm) {
      const v: Types.OpenGovVoter = {
        abstainCount: voter.abstainCount,
        address: voter.address,
        ayeCount: voter.ayeCount,
        castedCount: voter.castedVotes,
        delegatedCount: voter.delegatedVotes,
        delegationAmount: voter.delegationAmount,
        delegationCount: voter.delegationCount,
        identity: voter.identity,
        nayCount: voter.nayCount,
        score: {
          baseDemocracyScore: voter.score.baseDemocracyScore,
          lastConsistencyMultiplier: voter.score.lastConsistencyMultiplier,
          totalConsistencyMultiplier: voter.score.totalConsistencyMultiplier,
          totalDemocracyScore: voter.score.totalDemocracyScore,
          normalizedScore: voter.normalizedScore,
        },
        voteCount: voter.voteCount,
        votingBalance: voter.votingBalance,
        labels: voter.labels,
      };
      await queries.setOpenGovVoter(v);
    }

    return norm.sort(
      (a, b) =>
        b.normalizedScore - a.normalizedScore ||
        b.castedVotes - a.castedVotes ||
        b.delegationAmount - a.delegationAmount
    );
  } catch (e) {}

  const end = Date.now();
  logger.info(
    `Setting voters done, took ${(end - start) / 1000}s`,
    democracyLabel
  );
};

export const setDelegates = async (chaindata) => {
  logger.info(`Setting Delegates`, democracyLabel);
  const start = Date.now();
  try {
    const { allValidators: validators, chainValidators } =
      await getValidatorAddresses(chaindata);
    const nominators = await getNominatorAddresses(chaindata);
    const fellowshipAddresses = await getFellowshipAddresses(chaindata);
    const identityAddresses = await getIdentityAddresses();
    const societyAddresses = await getSocietyAddresses(chaindata);

    const voters = [];
    const convictionVotes = await ConvictionVoteModel.find({}).lean().exec();

    if (convictionVotes.length == 0) {
      logger.info(`no conviction votes found`, democracyLabel);
      return;
    }

    for (const vote of convictionVotes) {
      if (!voters.includes(vote.address)) {
        voters.push(vote.address);
      }
    }

    const latestRef = (
      await OpenGovReferendumModel.find({})
        .lean()
        .sort("-index")
        .select({ index: 1 })
        .exec()
    )[0];

    const voterList = await Promise.all(
      voters.map(async (address) => {
        const addressVotes = convictionVotes.filter((vote) => {
          if (vote.address == address) return true;
        });
        const identity = await getIdentityName(address);
        const delegations = await getOpenGovDelegationPeak(address);

        const lastVote =
          addressVotes.length > 0
            ? addressVotes.reduce(function (prev, current) {
                return prev.referendumIndex > current.referendumIndex
                  ? prev
                  : current;
              })
            : null;

        const balance =
          lastVote.balance.aye +
          lastVote.balance.nay +
          lastVote.balance.abstain;

        const votes = addressVotes
          .map((vote) => {
            return vote.referendumIndex;
          })
          .sort((a, b) => b - a);

        const isNominator = nominators.includes(address);
        const isValidator = validators.includes(address);
        const isFellowship = fellowshipAddresses.includes(address);
        const isSociety = societyAddresses.includes(address);
        const labels = [];

        if (isNominator) {
          labels.push("Nominator");
        }
        if (isValidator) {
          labels.push("Validator");
        }
        if (isFellowship) {
          labels.push("Fellowship");
        }
        if (isSociety) {
          labels.push("Society");
        }

        return {
          score: scoreDemocracyVotes(votes, latestRef.index, 1500, 30),
          address: address,
          identity: identity ? identity.name : address,
          voteCount: addressVotes.length,
          ayeCount: addressVotes.filter((vote) => {
            if (vote.voteDirection == "Aye") return true;
          }).length,
          nayCount: addressVotes.filter((vote) => {
            if (vote.voteDirection == "Nay") return true;
          }).length,
          abstainCount: addressVotes.filter((vote) => {
            if (vote.voteDirection == "Abstain") return true;
          }).length,
          castedVotes: addressVotes.filter((vote) => {
            if (vote.voteType == "Casting") return true;
          }).length,
          delegatedVotes: addressVotes.filter((vote) => {
            if (vote.voteType == "Delegating") return true;
          }).length,
          votes: votes,
          delegationCount: delegations ? delegations.delegatorCount : 0,
          // delegators: highestDelegation ? highestDelegation.delegators : [],
          delegationAmount: delegations ? delegations?.totalBalance : 0,
          votingBalance: balance,
          labels: labels,
        };
      })
    );
    const scoreValues = voterList
      .filter((v) => {
        if (v.delegationCount > 0) return true;
      })
      .map((votes) => {
        return votes.score.totalDemocracyScore;
      });
    const norm = voterList
      .filter((v) => {
        if (v.delegationCount > 0) return true;
      })
      .map((votes) => {
        return {
          normalizedScore:
            scaledDefined(
              votes.score.totalDemocracyScore,
              scoreValues,
              0.2,
              0.95
            ) * 100,
          ...votes,
        };
      });

    const registryUrl =
      "https://raw.githubusercontent.com/nova-wallet/opengov-delegate-registry/master/registry/kusama.json";
    const res = await fetch(registryUrl).then((response) => response.json());

    const delegateMap = new Map();
    for (const delegate of res) {
      const {
        address,
        name,
        image,
        shortDescription,
        longDescription,
        isOrganization,
      } = delegate;
      delegateMap.set(address, {
        name,
        image,
        shortDescription,
        longDescription,
        isOrganization,
      });
    }

    for (const delegate of norm) {
      const registryInfo = delegateMap.get(delegate.address);
      const d: Types.OpenGovDelegate = {
        abstainCount: delegate.abstainCount,
        address: delegate.address,
        ayeCount: delegate.ayeCount,
        castedCount: delegate.castedVotes,
        delegatedCount: delegate.delegatedVotes,
        delegationAmount: delegate.delegationAmount,
        delegationCount: delegate.delegationCount,
        identity: delegate.identity,
        nayCount: delegate.nayCount,
        score: {
          baseDemocracyScore: delegate.score.baseDemocracyScore,
          lastConsistencyMultiplier: delegate.score.lastConsistencyMultiplier,
          totalConsistencyMultiplier: delegate.score.totalConsistencyMultiplier,
          totalDemocracyScore: delegate.score.totalDemocracyScore,
          normalizedScore: delegate.normalizedScore,
        },
        voteCount: delegate.voteCount,
        votingBalance: delegate.votingBalance,
        labels: delegate.labels,
        name: registryInfo ? registryInfo.name : "",
        image: registryInfo ? registryInfo.image : "",
        shortDescription: registryInfo ? registryInfo.shortDescription : "",
        longDescription: registryInfo ? registryInfo.longDescription : "",
        isOrganization: registryInfo ? registryInfo.isOrganization : null,
      };
      await queries.setOpenGovDelegate(d);
    }

    return norm.sort(
      (a, b) =>
        b.normalizedScore - a.normalizedScore ||
        b.castedVotes - a.castedVotes ||
        b.delegationAmount - a.delegationAmount
    );
  } catch (e) {
    logger.warn(`could not set delegates`, democracyLabel);
    logger.warn(JSON.stringify(e), democracyLabel);
  }
  const end = Date.now();
  logger.info(
    `Set Delegates Done. Took ${(end - start) / 1000}s`,
    democracyLabel
  );
};

export const setTracks = async (chaindata) => {
  logger.info(`Setting Tracks`, democracyLabel);
  const start = Date.now();
  try {
    const trackTypes = await chaindata.getTrackInfo();
    for (const track of trackTypes) {
      await queries.setOpenGovTrack(track);
    }
  } catch (e) {
    logger.warn(`could not set tracks`, democracyLabel);
    logger.warn(JSON.stringify(e), democracyLabel);
  }
  const end = Date.now();
  logger.info(`Tracks Done. Took ${(end - start) / 1000}s`, democracyLabel);
};

export const queryAndSetConvictionVoting = async (chaindata) => {
  try {
    logger.info(`Querying conviction Voting`, democracyLabel);
    const start = Date.now();

    const latestBlockNumber = await chaindata.getLatestBlock();

    const { finishedVotes, ongoingVotes, delegations } =
      await chaindata.getConvictionVoting();

    logger.info(
      `Writing ${finishedVotes.length} finished votes to db..`,
      democracyLabel
    );

    for (const [index, vote] of finishedVotes.entries()) {
      await queries.setConvictionVote(vote, latestBlockNumber);

      // Try to set the identity
      const identityExists = await queries.getIdentity(vote.address);
      if (!identityExists) {
        const identity = await chaindata.getFormattedIdentity(vote.address);
        await queries.setIdentity(identity);
      }

      if (index % 100 == 0) {
        logger.info(
          `Wrote ${vote.referendumIndex} to db [${index}/${finishedVotes.length}]`,
          democracyLabel
        );
      }
    }
    const vend = Date.now();
    logger.info(
      `Done setting ${
        finishedVotes.length
      } finished Votes and Identities. Took ${(vend - start) / 1000} seconds`,
      democracyLabel
    );

    const vstart2 = Date.now();
    logger.info(
      `Writing ${ongoingVotes.length} ongoing votes to db..`,
      democracyLabel
    );
    for (const [index, vote] of ongoingVotes.entries()) {
      await queries.setConvictionVote(vote, latestBlockNumber);

      // Try to set the identity
      const identityExists = await queries.getIdentity(vote.address);
      if (!identityExists) {
        const identity = await chaindata.getFormattedIdentity(vote.address);
        await queries.setIdentity(identity);
      }

      if (index % 100 == 0) {
        logger.info(
          `Wrote ${vote.referendumIndex} to db [${index}/${ongoingVotes.length}]`,
          democracyLabel
        );
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
    logger.warn(`could not set conviction voting`, democracyLabel);
    logger.warn(JSON.stringify(e), democracyLabel);
  }
};

export const democracyJob = async (chaindata: ChainData) => {
  const start = Date.now();
  logger.info(`Starting Democracy Job`, democracyLabel);
  try {
    await setVoters(chaindata);
    await setDelegates(chaindata);
    await queryAndSetAllReferenda(chaindata);
    await democracyStatsJob(chaindata);
    await setTracks(chaindata);
    await queryAndSetConvictionVoting(chaindata);
  } catch (e) {
    logger.warn(`Democracy job failed`, democracyLabel);
    logger.error(JSON.stringify(e), democracyLabel);
  }
  const endTime = Date.now();
  logger.info(`Done. Took ${(endTime - start) / 1000} seconds`, democracyLabel);
};

export const processDemocracyJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Democracy Job....`, democracyLabel);
  await democracyJob(chaindata);
};
