import Db from "../db";
import ApiHandler from "../ApiHandler";
import ChainData from "../chaindata";
import logger from "../logger";
import { toDecimals } from "../util";

export const writeHistoricNominations = async (
  handler: ApiHandler,
  db?: Db
): Promise<boolean> => {
  const api = await handler.getApi();

  const START_ERA = 0;

  const chaindata = new ChainData(handler);
  const [activeEra, err] = await chaindata.getActiveEraIndex();

  logger.info(
    `{writeHistoricNominations} Writing historic nominations, starting from era ${activeEra} to era ${START_ERA}`
  );

  const nominators = await db.allNominators();

  for (const nominator of nominators) {
    const stash = await chaindata.getStashFromController(nominator.address);
    if (!stash) {
      logger.warn(
        `{writeHistoricNominations} Nominator ${nominator.address} does not have a stash...`
      );
      continue;
    }
    logger.info(
      `{writeHistoricNominations} Nominator ${nominator.address} Stash account: ${stash}`
    );

    for (let i = activeEra; i >= START_ERA; i--) {
      logger.info(
        `{writeHistoricNominations} fetching nominations for ${stash} for era ${i}`
      );
      const [blockhash, error] = await chaindata.findEraBlockHash(
        i,
        "Local Testnet"
      );

      if (error) {
        logger.info(
          `{writeHistoricNominations} There was an error fetching the block hash for era ${i}`
        );
        return false;
      }

      const nomination = (
        await api.query.staking.nominators.at(blockhash, stash)
      ).toJSON();
      if (!nomination) {
        logger.info(
          `{writeHistoricNominations} There was an error fetching nominations for stash ${stash}`
        );
        return false;
      }
      const submittedIn = nomination["submittedIn"];
      const targets = nomination["targets"];

      if (!submittedIn || !targets) {
        continue;
      }

      const decimals = (await db.getChainMetadata()).decimals;
      const bonded = toDecimals(
        (
          await api.query.staking.ledger.at(blockhash, nominator.address)
        ).toJSON()["active"],
        decimals
      );

      await db.setNomination(nominator.address, submittedIn, targets, bonded);
    }
  }

  return true;
};
