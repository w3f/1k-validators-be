import logger from "../logger";
import { blake2AsHex } from "@polkadot/util-crypto";
import { DelayedTx } from "../db";
import { ChainData, queries } from "../index";
import Nominator, { nominatorLabel } from "./nominator";
import { ApiPromise } from "@polkadot/api";
import MatrixBot from "../matrix";

// Sends a Proxy Delay Nominate Tx for a given nominator
// TODO: unit tests
// TODO: integration tests
export const sendProxyDelayTx = async (
  nominator: Nominator,
  targets: string[],
  chaindata: ChainData,
  api: ApiPromise,
): Promise<boolean> => {
  try {
    logger.info(
      `{Nominator::nominate::proxy} starting tx for ${nominator.address} with proxy delay ${nominator.proxyDelay} blocks`,
      nominatorLabel,
    );
    nominator.updateNominatorStatus({
      status: `[noninate] starting proxy delay tx`,
      updated: Date.now(),
      stale: false,
    });

    const innerTx = api?.tx.staking.nominate(targets);

    const currentBlock = await chaindata.getLatestBlock();
    if (!currentBlock) {
      logger.error(
        `{Nominator::nominate} there was an error getting the current block`,
        nominatorLabel,
      );
      nominator.updateNominatorStatus({
        status: `[noninate] err: no current block`,
        updated: Date.now(),
        stale: false,
      });
      return false;
    }
    const callHash = innerTx.method.hash.toString();

    const tx = api?.tx.proxy.announce(
      nominator.bondedAddress,
      blake2AsHex(innerTx.method.toU8a()),
    );

    const delayedTx: DelayedTx = {
      number: currentBlock,
      controller: nominator.bondedAddress,
      targets,
      callHash,
    };
    await queries.addDelayedTx(delayedTx);
    nominator.updateNominatorStatus({
      status: `[noninate] tx: ${JSON.stringify(delayedTx)}`,
      updated: Date.now(),
      stale: false,
    });

    const allProxyTxs = await queries.getAllDelayedTxs();

    const didSend = await nominator.signAndSendTx(tx);
    nominator.updateNominatorStatus({
      status: `Announced Proxy Tx: ${didSend}`,
      nextTargets: targets,
      updated: Date.now(),
      stale: false,
      proxyTxs: allProxyTxs,
    });

    return true;
  } catch (e) {
    logger.error(
      `{Nominator::nominate} there was an error sending the tx`,
      nominatorLabel,
    );
    logger.error(JSON.stringify(e), nominatorLabel);
    nominator.updateNominatorStatus({
      status: `Proxy Delay Error: ${JSON.stringify(e)}`,
      updated: Date.now(),
    });
    return false;
  }
};

// Sends  Non-Delay Proxy Nominate Tx for a given nominator
// TODO: unit test
// TODO: integration tests
export const sendProxyTx = async (
  nominator: Nominator,
  targets: string[],
  chaindata: ChainData,
  api: ApiPromise,
  bot?: MatrixBot,
): Promise<boolean> => {
  try {
    // Start a normal proxy tx call
    logger.info(
      `{Nominator::nominate::proxy} starting non delay tx for ${nominator.address} `,
      nominatorLabel,
    );

    const innerTx = api?.tx.staking.nominate(targets);
    const callHash = innerTx.method.hash.toString();

    const outerTx = api.tx.proxy.proxy(
      nominator.bondedAddress,
      "Staking",
      innerTx,
    );

    const [didSend, finalizedBlockHash] = (await nominator.sendStakingTx(
      outerTx,
      targets,
    )) ?? [false, ""];

    const era = await chaindata.getCurrentEra();
    if (!era) {
      logger.error(
        `{Nominator::nominate} there was an error getting the current era`,
        nominatorLabel,
      );
      return false;
    }
    const [bonded, err] = await chaindata.getDenomBondedAmount(
      nominator.bondedAddress,
    );

    if (bonded) {
      await queries.setNomination(
        nominator.bondedAddress,
        era,
        targets,
        bonded || 0,
        finalizedBlockHash || "",
      );
    }

    const namedTargets = await Promise.all(
      targets.map(async (val) => {
        const name = await queries.getIdentityName(val);
        const kyc = await queries.isKYC(val);
        return {
          address: val,
          name: name,
          kyc: kyc,
        };
      }),
    );
    const currentEra = await chaindata.getCurrentEra();

    nominator.updateNominatorStatus({
      status: "Submitted Proxy Tx",
      currentTargets: namedTargets,
      updated: Date.now(),
      stale: false,
      lastNominationEra: currentEra,
    });
    nominator.currentlyNominating = targets;

    const nominateMsg = `{Nominator::nominate::proxy} non-delay ${nominator.address} sent tx: ${didSend} finalized in block #${finalizedBlockHash}`;
    logger.info(nominateMsg, nominatorLabel);
    if (bot) await bot?.sendMessage(nominateMsg);
    return true;
  } catch (e) {
    logger.error(
      `{Nominator::nominate} there was an error sending the tx`,
      nominatorLabel,
    );
    logger.error(JSON.stringify(e), nominatorLabel);
    nominator.updateNominatorStatus({
      status: `Proxy Error: ${JSON.stringify(e)}`,
      updated: Date.now(),
    });
    return false;
  }
};
