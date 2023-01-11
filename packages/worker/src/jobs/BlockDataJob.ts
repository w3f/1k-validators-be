import { ChainData, logger, Util, queries, ApiHandler } from "@1kv/common";
import { ApiPromise } from "@polkadot/api";

import { extractAuthor } from "@polkadot/api-derive/type/util";

export const blockdataLabel = { label: "Block" };

export const blockDataJob = async (chaindata: ChainData) => {
  const start = Date.now();

  logger.info(`Starting blockDataJob`, blockdataLabel);
  const latestBlock = await chaindata.getLatestBlock();
  const threshold = 2000000;
  let earliest, latest;
  for (let i = latestBlock; i > latestBlock - threshold; i--) {
    const index = await queries.getHeartbeatIndex();

    if (
      !index?.earliest ||
      !index?.latest ||
      i < index?.earliest ||
      i > index?.latest
    ) {
      await processBlock(chaindata, i);
      await queries.setHeartbeatIndex(i, i);
      logger.info(`Block Data Job: processed: ${i}`);
    } else {
      logger.info(`Skipping Block ${i}`);
    }
  }
  logger.info(`Done, processed all blocks`, blockdataLabel);
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
  const chaindata = new ChainData(new ApiHandler(apiAt));
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
            const ipv6_regex =
              // eslint-disable-next-line security/detect-unsafe-regex
              /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gi;

            const isIPV6 = ipv6_regex.test(address);
            if (
              !ip ||
              isIPV6 ||
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
                Number(port),
                session
              );
            }
          })
        );

        //const { heartbeat: {blockNumber, networkState: {peerId, externalAddresses}, sessionIndex, authorityIndex, validatorsLen, signature}}} = args.data;
        break;
      case "paraInherent":
        // const { bitfields, backedCandidates, disputes, parentHeader } =
        //   args.data;
        //
        // for (const bitfield of bitfields) {
        //   const { payload, validatorIndex, signature } = bitfield;
        //
        //   const session = await chaindata.getSessionAt(apiAt);
        //   const paraValIndices = await chaindata.getParaValIndicesAt(apiAt);
        //   const val = validators[paraValIndices[validatorIndex]];
        //
        //   const bit: AvailabilityBitfield = {
        //     blockNumber: blockNumber,
        //     validator: val,
        //     candidateChunkCount: payload.toString().split("1").length - 1,
        //     bitfield: payload.toString(),
        //     signature: signature.toString(),
        //     session: session,
        //     valIdx: validatorIndex,
        //     availableCandidates: [],
        //   };
        //   // AvailabilityBitfield.addAvailibilityBitfield(bit);
        //   logger.info(bit);
        // }
        //
        // for (const candidate of backedCandidates) {
        //   const {
        //     candidate: {
        //       descriptor: {
        //         paraId,
        //         relayParent,
        //         collator,
        //         povHash,
        //         erasureRoot,
        //         signature,
        //         paraHead,
        //         validationCodeHash,
        //       },
        //     },
        //     validityVotes,
        //     validatorIndices,
        //   } = candidate;

        // console.log(candidate);
        // }
        break;
      default:
        break;
    }
  }
};

export const processBlockDataJob = async (job: any, chaindata: ChainData) => {
  const { blockNumber } = job.data;
  const start = Date.now();
  await processBlock(chaindata, blockNumber);
  const end = Date.now();

  // logger.info(
  //   `#${blockNumber} Done (${(end - start) / 1000}s)`,
  //   blockdataLabel
  // );
  return (end - start) / 1000;
};
