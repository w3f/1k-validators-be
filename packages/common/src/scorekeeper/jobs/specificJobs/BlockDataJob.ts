import { ChainData, logger, queries } from "../../../index";
import { ApiPromise } from "@polkadot/api";
import { CoinGeckoClient } from "coingecko-api-v3";
import { jobsMetadata } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { formatDateFromUnix, withExecutionTimeLogging } from "../../../utils";
import { Block } from "@polkadot/types/interfaces";

export const blockdataLabel = { label: "Block" };

export const blockJob = async (metadata: jobsMetadata): Promise<boolean> => {
  const { chaindata } = metadata;
  try {
    logger.info(`Starting blockDataJob`, blockdataLabel);
    const latestBlock = await chaindata.getLatestBlock();
    const threshold = 2000;
    let index = await queries.getBlockIndex();

    if (!index?.latest && !index?.earliest) {
      logger.info(
        `Block index not found. Querying latest block: #${latestBlock}`,
        blockdataLabel,
      );
      await processBlock(chaindata, latestBlock);
      await queries.setBlockIndex(latestBlock, latestBlock);
      index = await queries.getBlockIndex();
    }

    // Try to index from the latest block to the current block
    if (index?.latest && index?.latest != latestBlock) {
      const latestTotal = latestBlock - index.latest;
      logger.info(
        `Processing ${latestTotal} blocks from latest index: ${index.latest} to current block ${latestBlock}`,
        blockdataLabel,
      );
      let latestCount = 0;
      for (let i = index.latest; i < latestBlock; i++) {
        index = await queries.getBlockIndex();
        if (i > index.latest) {
          await processBlock(chaindata, i);
          latestCount++;
          // Update the latest block index
          await queries.setBlockIndex(index?.earliest, i);
          logger.info(
            `Block Data Job: processed: ${i} (${latestCount}/${latestTotal})`,
            blockdataLabel,
          );
        }
        jobStatusEmitter.emit("jobProgress", {
          name: "Block Data Job",
          progress: (latestCount / latestTotal) * 100,
          updated: Date.now(),
          iteration: `Block processed: #${i}`,
        });
      }
      logger.info(
        `Processed ${latestTotal} blocks up to the current block.`,
        blockdataLabel,
      );
    }
    // index from the earliest block backwards
    if (index?.earliest && index?.earliest != latestBlock) {
      const earliestTotal = index?.earliest - (index?.earliest - threshold);
      logger.info(
        `Processing ${earliestTotal} blocks from earliest index: ${
          index.earliest
        } to threshold block ${index?.earliest - threshold}`,
        blockdataLabel,
      );
      let earliestCount = 0;
      for (let i = index?.earliest; i > index?.earliest - threshold; i--) {
        const index = await queries.getBlockIndex();

        if (i < index?.earliest) {
          await processBlock(chaindata, i);
          // Update the earliest block
          await queries.setBlockIndex(i, index?.latest);
          earliestCount++;
          logger.info(
            `Block Data Job: processed: ${i} (${earliestCount}/${earliestTotal})`,
            blockdataLabel,
          );
        }
        jobStatusEmitter.emit("jobProgress", {
          name: "Block Data Job",
          progress: (earliestCount / earliestTotal) * 100,
          updated: Date.now(),
          iteration: `Block processed: #${i}`,
        });
      }
      logger.info(
        `Processed ${earliestTotal} blocks up to the threshold`,
        blockdataLabel,
      );
    }
    logger.info(`Done, processed  all blocks`, blockdataLabel);
    return true;
  } catch (e) {
    logger.error(`Error processing block data: ${e}`, blockdataLabel);
    return false;
  }
};

export const blockJobWithTiming = withExecutionTimeLogging(
  blockJob,
  blockdataLabel,
  "Block Job Done",
);

// Given a block number, process it's extrinsics and events
export const processBlock = async (
  chaindata: ChainData,
  blockNumber: number,
) => {
  if (blockNumber < 0) return;

  // logger.info(`Processing block #${blockNumber}`, blockdataLabel);
  const start = Date.now();

  const block: Block = await chaindata.getBlock(blockNumber);

  const blockHash = await chaindata.getBlockHash(blockNumber);

  const apiAt = await chaindata.getApiAt(blockNumber);

  // const validators = await chaindata.getValidatorsAt(apiAt);

  const session = await chaindata.getSessionAt(apiAt);

  const era = await chaindata.getEraAt(apiAt);

  const blockExtrinsics = block.extrinsics;
  const blockEvents = await apiAt.query.system.events();

  // const blockType = chaindata.getBlockType(block);
  // const blockAuthor = extractAuthor(
  //   block.block.header.digest,
  //   validators
  // )?.toString();

  // Parse the blocks extrinsics of the block
  await parseExtrinsics(block, blockHash, blockEvents, chaindata);

  // Parse the events of the block
  await parseEvents(blockEvents, apiAt, blockNumber, blockHash, era, session);

  // Update the indexed block bounds
  const blockIndex = await queries.getBlockIndex();
  // If the block processed is later than the last indexed in the db, update the latest block index
  if (blockIndex?.latest && blockNumber > blockIndex.latest) {
    await queries.setBlockIndex(blockIndex.earliest, blockNumber);
  }

  // If the block processed is later than the last indexed in the db, update the latest block index
  if (blockIndex?.earliest && blockNumber < blockIndex.earliest) {
    await queries.setBlockIndex(blockNumber, blockIndex?.latest);
  }
  const end = Date.now();
  logger.info(
    `Done processing block #${blockNumber} (${(end - start) / 1000}s)`,
    blockdataLabel,
  );
};

// Process all payout extrinsics, write payout transactions, nominator rewards, and validator rewards to the db
const processPayoutStakers = async (
  chaindata: any,
  args: any,
  extrinsicIndex: any,
  signer: any,
  blockHash: any,
  blockNumber: any,
  blockTimestamp: any,
  blockEvents: any,
) => {
  const denom = await chaindata.getDenom();
  const apiAt = await chaindata.getApiAt(blockNumber);

  const CoinGecko = new CoinGeckoClient({});

  const validatorRewards = [];
  const nominatorRewards = [];
  const payoutTxs = [];

  // Get the Validator whom the reward is from and the era the reward is for
  const [validator, era] = args;

  // Get the commission for the validator
  const commission = await chaindata.getCommissionInEra(apiAt, era, validator);
  const commissionPercentage = parseFloat(commission) / Math.pow(10, 7);

  // Get the staking exposure of the validator and all of their nominators
  const exposure = await chaindata.getExposureAt(apiAt, era, validator);
  const { total, own, others } = exposure;

  const minStake = await chaindata.getErasMinStakeAt(apiAt, era);
  const valStakeEfficiency = (1 - (total - minStake) / total) * 100;

  // Add add the payout transaction to the list of txs to get written to the db
  const payoutTx = {
    validator: validator,
    era: parseFloat(era),
    submitter: signer.toString(),
    blockHash: blockHash,
    blockNumber: blockNumber,
    timestamp: blockTimestamp,
  };
  payoutTxs.push(payoutTx);

  // Go through each of the blocks events and find the ones that corresopnd to the payoutStakers extrinsic
  const rewardEvents = blockEvents
    .filter(
      ({ phase }) =>
        phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex),
    )
    .filter(({ event }) => {
      return event.section == "staking" && event.method == "Rewarded";
    });

  // For each of the reward events, get the nominator and the amount of the reward, add these to the list of rewards to get written to the db
  if (rewardEvents.length > 0) {
    for (const event of rewardEvents) {
      const data = event?.event?.data;
      if (data) {
        const [nominator, amount] = data.toJSON();
        const rewardDestination = await chaindata.getRewardDestinationAt(
          apiAt,
          nominator,
        );
        const isValidator = nominator == validator;

        let exposurePercentage;
        const ownExposure = others.filter((ex) => {
          return ex.address == nominator;
        });
        if (ownExposure.length > 0) {
          exposurePercentage = (ownExposure[0].bonded / total) * 100;
        }

        const rewardAmount = parseFloat(amount) / denom;

        const formattedDate = formatDateFromUnix(blockTimestamp);

        const chainMetadata = await queries.getChainMetadata();
        const networkName = chainMetadata.name.toLowerCase();

        let chf, eur, usd;
        const price = await queries.getPrice(networkName, formattedDate);
        if (!price) {
          const price_call = await CoinGecko.coinIdHistory({
            id: networkName,
            date: formattedDate,
          });
          chf = price_call?.market_data?.current_price?.chf || 0;
          eur = price_call?.market_data?.current_price?.eur || 0;
          usd = price_call?.market_data?.current_price?.usd || 0;
          await queries.setPrice(networkName, formattedDate, chf, usd, eur);
        } else {
          chf = price.chf || 0;
          eur = price.eur || 0;
          usd = price.usd || 0;
        }

        const reward = {
          era: parseFloat(era),
          exposurePercentage: exposurePercentage || 0,
          exposure: ownExposure[0]?.value,
          totalStake: parseInt(total),
          commission: commissionPercentage || 0,
          validator: validator,
          nominator: nominator,
          rewardAmount: parseFloat(amount) / denom,
          rewardDestination: rewardDestination,
          erasMinStake: minStake,
          validatorStakeEfficiency: valStakeEfficiency,
          blockHash: blockHash,
          blockNumber: blockNumber,
          timestamp: blockTimestamp,
          date: formattedDate,
          chf: chf * rewardAmount || 0,
          eur: eur * rewardAmount || 0,
          usd: usd * rewardAmount || 0,
        };

        if (isValidator) {
          validatorRewards.push({
            ...reward,
            role: "validator",
          });
        } else {
          nominatorRewards.push({
            ...reward,
            role: "nominator",
          });
        }
      }
    }
  }

  // Write the payout transaction, validator rewards, and nominator rewards to the db
  await Promise.all(
    validatorRewards.map(async (reward) => {
      await queries.setReward(
        reward.role,
        reward.exposurePercentage,
        reward.exposure,
        reward.totalStake,
        reward.commission,
        reward.era,
        reward.validator,
        reward.nominator,
        reward.rewardAmount,
        reward.rewardDestination,
        reward.validatorStakeEfficiency,
        reward.erasMinStake,
        reward.blockHash,
        reward.blockNumber,
        reward.timestamp,
        reward.date,
        reward.chf,
        reward.usd,
        reward.eur,
      );
    }),
  );
  await Promise.all(
    nominatorRewards.map(async (reward) => {
      await queries.setReward(
        reward.role,
        reward.exposurePercentage,
        reward.exposure,
        reward.totalStake,
        reward.commission,
        reward.era,
        reward.validator,
        reward.nominator,
        reward.rewardAmount,
        reward.rewardDestination,
        reward.validatorStakeEfficiency,
        reward.erasMinStake,
        reward.blockHash,
        reward.blockNumber,
        reward.timestamp,
        reward.date,
        reward.chf,
        reward.usd,
        reward.eur,
      );
    }),
  );
  await Promise.all(
    payoutTxs.map(async (tx) => {
      await queries.setPayoutTransaction(
        tx.validator,
        tx.era,
        tx.submitter,
        tx.blockHash,
        tx.blockNumber,
        tx.timestamp,
      );
    }),
  );
};

export const parseExtrinsics = async (
  block: any,
  blockHash: any,
  events: any,
  chaindata: any,
) => {
  // Get the block number
  const blockNumber = parseInt(block.header.number);

  // logger.info(
  //   `Processing extrinsics of block #${blockNumber}..`,
  //   blockdataLabel
  // );

  const extrinsics = block.extrinsics;

  // The block timestamp
  let blockTimestamp;
  // Set the timestamp
  block.extrinsics.forEach(
    ({ signer, method: { method, section }, args }, index) => {
      if (method == "timestamp" || method == "set") {
        blockTimestamp = parseInt(args[0]);
      }
    },
  );

  await Promise.all(
    extrinsics.map(
      async ({ signer, method: { method, section }, args }, index) => {
        let validator;
        if (method == "payoutStakers") {
          // logger.info(`Payout Stakers extrinsics:`, blockdataLabel);
          await processPayoutStakers(
            chaindata,
            args,
            index,
            signer,
            blockHash,
            blockNumber,
            blockTimestamp,
            events,
          );
        } else if (method == "batch" || method == "batchAll") {
          for (const arg of args[0]) {
            const { method, section } = arg;
            // If there was a payoutStakers tx
            if (method.toString() == "payoutStakers") {
              await processPayoutStakers(
                chaindata,
                arg.args,
                index,
                signer,
                blockHash,
                blockNumber,
                blockTimestamp,
                events,
              );
            }
          }
        }
      },
    ),
  );
};

// Process all the events of a block
export const parseEvents = async (
  blockEvents: any,
  apiAt: ApiPromise,
  blockNumber: number,
  blockHash: string,
  era: number,
  session: number,
) => {
  blockEvents.map(async (event: any) => {
    if (event.section === "imOnline" && event.method === "SomeOffline") {
      const offlineVals = event.data.toJSON()[0].map((val) => val[0]);

      logger.info(
        `Offline: vals: ${JSON.stringify(offlineVals)} `,
        blockdataLabel,
      );
    }
  });
};

// Given a block, parse all the extrinsics
// export const parseExtrinsics = async (
//   extrinsics: any,
//   apiAt: ApiPromise,
//   validators: any,
//   blockNumber: number,
//   era: number,
//   session: number
// ) => {
//   const chaindata = new ChainData(new ApiHandler(apiAt));
//   for (const extrinsic of extrinsics) {
//     const decoded = extrinsic.toHuman();
//     //@ts-ignore
//     const {
//       isSigned,
//       signer,
//       method: { args, method: palletMethod, section },
//     } = decoded;
//
//     switch (section) {
//       case "timestamp":
//         const { now } = args;
//         const timestamp = now.replace(/,/g, "");
//         break;
//       case "imOnline":
//         const {
//           heartbeat: {
//             networkState: { peerId, externalAddresses },
//             authorityIndex,
//           },
//         } = args;
//         const validator = validators[authorityIndex];
//         const identity = await Util.getFormattedIdentity(apiAt, validator);
//         const ips = await Promise.all(
//           externalAddresses.map(async (address: string) => {
//             const { ip, port } = Util.parseIP(address);
//             const ipv6_regex =
//               // eslint-disable-next-line security/detect-unsafe-regex
//               /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gi;
//
//             const isIPV6 = ipv6_regex.test(address);
//             if (
//               !ip ||
//               isIPV6 ||
//               ip.indexOf("10.") == 0 ||
//               ip.indexOf("100.") == 0 ||
//               ip.indexOf("127.") == 0 ||
//               ip.indexOf("172.") == 0 ||
//               ip.indexOf("192.") == 0 ||
//               ip.indexOf("127.") == 0
//             ) {
//             } else {
//               await queries.setHeartbeatLocation(
//                 identity.name,
//                 validator,
//                 ip,
//                 Number(port),
//                 session
//               );
//             }
//           })
//         );
//
//         //const { heartbeat: {blockNumber, networkState: {peerId, externalAddresses}, sessionIndex, authorityIndex, validatorsLen, signature}}} = args.data;
//         break;
//       case "paraInherent":
//         // const { bitfields, backedCandidates, disputes, parentHeader } =
//         //   args.data;
//         //
//         // for (const bitfield of bitfields) {
//         //   const { payload, validatorIndex, signature } = bitfield;
//         //
//         //   const session = await chaindata.getSessionAt(apiAt);
//         //   const paraValIndices = await chaindata.getParaValIndicesAt(apiAt);
//         //   const val = validators[paraValIndices[validatorIndex]];
//         //
//         //   const bit: AvailabilityBitfield = {
//         //     blockNumber: blockNumber,
//         //     validator: val,
//         //     candidateChunkCount: payload.toString().split("1").length - 1,
//         //     bitfield: payload.toString(),
//         //     signature: signature.toString(),
//         //     session: session,
//         //     valIdx: validatorIndex,
//         //     availableCandidates: [],
//         //   };
//         //   // AvailabilityBitfield.addAvailibilityBitfield(bit);
//         //   logger.info(bit);
//         // }
//         //
//         // for (const candidate of backedCandidates) {
//         //   const {
//         //     candidate: {
//         //       descriptor: {
//         //         paraId,
//         //         relayParent,
//         //         collator,
//         //         povHash,
//         //         erasureRoot,
//         //         signature,
//         //         paraHead,
//         //         validationCodeHash,
//         //       },
//         //     },
//         //     validityVotes,
//         //     validatorIndices,
//         //   } = candidate;
//
//         // console.log(candidate);
//         // }
//         break;
//       default:
//         break;
//     }
//   }
// };

export const processBlockDataJob = async (job: any, chaindata: ChainData) => {
  const { blockNumber } = job.data;
  const start = Date.now();
  logger.info(`#${blockNumber} Processing...`, blockdataLabel);
  await processBlock(chaindata, blockNumber);
  const end = Date.now();

  logger.info(
    `#${blockNumber} Done (${(end - start) / 1000}s)`,
    blockdataLabel,
  );
  return (end - start) / 1000;
};
