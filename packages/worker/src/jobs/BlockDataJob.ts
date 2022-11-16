import { ChainData, logger, Util, queries } from "@1kv/common";
import { ApiPromise } from "@polkadot/api";

import { extractAuthor } from "@polkadot/api-derive/type/util";
import { validatorPrefJob } from "./ValidatorPrefJob";

export const blockDataJob = async (chaindata: ChainData) => {
  const start = Date.now();

  logger.info(`Starting blockDataJob`);
  const latestBlock = await chaindata.getLatestBlock();
  const threshold = 10000;
  for (let i = latestBlock - threshold; i < latestBlock; i++) {
    // logger.info(`processing block: ${i}`);
    await processBlock(chaindata, i);
  }
  logger.info(`Done, processed all blocks`);
};

export const processBlock = async (
  chaindata: ChainData,
  blockNumber: number
) => {
  if (blockNumber < 0) return;

  const block = await chaindata.getBlock(blockNumber);

  const apiAt = await chaindata.getApiAt(blockNumber);

  const validators = await chaindata.getValidatorsAt(apiAt);
  const session = await chaindata.getSessionAt(apiAt);
  const era = await chaindata.getEraAt(apiAt);

  const blockExtrinsics = block.block.extrinsics;
  const blockType = chaindata.getBlockType(block);
  const blockAuthor = extractAuthor(
    block.block.header.digest,
    validators
  )?.toString();

  await parseExtrinsics(
    blockExtrinsics,
    apiAt,
    validators,
    blockNumber,
    era,
    session
  );
};

// Given a block, parse all the extrinsics
export const parseExtrinsics = async (
  extrinsics: any,
  apiAt: ApiPromise,
  validators: any,
  blockNumber: number,
  era: number,
  session: number
) => {
  for (const extrinsic of extrinsics) {
    const decoded = extrinsic.toHuman();
    //@ts-ignore
    const {
      isSigned,
      signer,
      method: { args, method: palletMethod, section },
    } = decoded;

    switch (section) {
      case "timestamp":
        const { now } = args;
        const timestamp = now.replace(/,/g, "");
        break;
      case "imOnline":
        const {
          heartbeat: {
            networkState: { peerId, externalAddresses },
            authorityIndex,
          },
        } = args;
        const validator = validators[authorityIndex];
        const identity = await Util.getFormattedIdentity(apiAt, validator);
        const ips = await Promise.all(
          externalAddresses.map(async (address: string) => {
            const { ip, port } = Util.parseIP(address);

            if (
              !ip ||
              ip.indexOf("10.") == 0 ||
              ip.indexOf("100.") == 0 ||
              ip.indexOf("127.") == 0 ||
              ip.indexOf("172.") == 0 ||
              ip.indexOf("192.") == 0 ||
              ip.indexOf("127.") == 0
            ) {
            } else {
              await queries.setHeartbeatLocation(
                identity.name,
                validator,
                ip,
                Number(port)
              );
            }
          })
        );

        //const { heartbeat: {blockNumber, networkState: {peerId, externalAddresses}, sessionIndex, authorityIndex, validatorsLen, signature}}} = args.data;
        break;
      case "paraInherent":
        const { bitfields, backedCandidates, disputes, parentHeader } =
          args.data;

        for (const bitfield of bitfields) {
          const { payload, validatorIndex, signature } = bitfield;

          // const val = validators[paraValIndices[validatorIndex]];

          // const bit: AvailabilityBitfield.AvailabilityBitfield = {
          //     blockNumber: blockNum,
          //     validator: val,
          //     candidateChunkCount: payload.toString().split('1').length - 1,
          //     bitfield: payload.toString(),
          //     signature: signature.toString(),
          // }
          // AvailabilityBitfield.addAvailibilityBitfield(bit);
        }

        for (const candidate of backedCandidates) {
          const {
            candidate: {
              descriptor: {
                paraId,
                relayParent,
                collator,
                povHash,
                erasureRoot,
                signature,
                paraHead,
                validationCodeHash,
              },
            },
            validityVotes,
            validatorIndices,
          } = candidate;

          // console.log(candidate);
        }
        break;
      default:
        break;
    }
  }
};

export const processBlockDataJob = async (job: any, chaindata: ChainData) => {
  const { blockNumber } = job.data;
  logger.info(`Processing Blockdata Job for block #${blockNumber}....`);
  await blockDataJob(chaindata);
};
