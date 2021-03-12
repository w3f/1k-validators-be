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

  const chainType = (await db.getChainMetadata()).name;

  const START_ERA =
    chainType == "Kusama" ? 1400 : chainType == "Polkadot" ? 175 : 0;

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

      const nom = await db.getNomination(stash, i);
      if (nom) continue;

      const nomination = await chaindata.getNominationAt(stash, i, db);
      if (!nomination) continue;
      if (i > nomination.submittedIn) {
        const nominationSubmittedIn = await chaindata.getNominationAt(
          stash,
          nomination.submittedIn,
          db
        );
        await db.setNomination(
          nominator.address,
          nominationSubmittedIn.submittedIn,
          nominationSubmittedIn.targets,
          nominationSubmittedIn.bonded,
          ""
        );
        i = nomination.submittedIn;
      } else {
        await db.setNomination(
          nominator.address,
          nomination.submittedIn,
          nomination.targets,
          nomination.bonded,
          ""
        );
      }
    }
  }

  return true;
};
