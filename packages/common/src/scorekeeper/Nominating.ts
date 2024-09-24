// Start nominations for all nominator groups:
// - For each nominator group - if they have current targets, wipe them
// - Determine the number of nominations to make for each nominator account
//     - This will either be a static number, or "auto"

import { autoNumNominations } from "./NumNominations";
import { scorekeeperLabel } from "./scorekeeper";
import logger from "../logger";
import { ChainData, queries, Util } from "../index";
import MatrixBot from "../matrix";
import { ConfigSchema } from "../config";
import Nominator from "../nominator/nominator";
import { NominatorState, NominatorStatus } from "../types";

// Takes in a list of valid Candidates, and will nominate them based on the nominator groups
export const doNominations = async (
  candidates: { name: string; stash: string; total: number }[],
  nominatorGroups: Nominator[],
  chaindata: ChainData,
  bot: MatrixBot,
  config: ConfigSchema,
  currentTargets: { name?: string; stash?: string; identity?: any }[],
): Promise<number | null> => {
  try {
    if (candidates.length == 0) {
      logger.warn(
        `Candidates length was 0. Skipping nominations`,
        scorekeeperLabel,
      );
      return null;
    }

    const currentEra = await chaindata.getCurrentEra();
    if (!currentEra) {
      logger.error(
        `Error getting current era. Skipping nominations`,
        scorekeeperLabel,
      );
      return null;
    }

    // The list of all valid Validators to nominate
    const allTargets = candidates.map((c) => {
      return { stash: c.stash };
    });

    // A counter to keep track of the number of nominations
    let counter = 0;

    for (const nominator of nominatorGroups) {
      const stash = await nominator.stash();
      const shouldNominate = await nominator.shouldNominate();
      if (!shouldNominate) {
        logger.info(
          `Nominator ${stash} has already nominated in era: ${nominator.lastEraNomination} (current era: ${currentEra}) - Skipping`,
        );
        continue;
      }

      const nominatorStatus: NominatorStatus = {
        state: NominatorState.Nominating,
        status: `Nominating...`,
        updated: Date.now(),
        stale: false,
      };
      await nominator.updateNominatorStatus(nominatorStatus);

      // The number of nominations to do per nominator account
      // This is either hard coded, or set to "auto", meaning it will find a dynamic amount of validators
      //    to nominate based on the lowest staked validator in the validator set
      const denom = await chaindata.getDenom();
      if (!denom) return null;
      const autoNom = await autoNumNominations(nominator);
      const { nominationNum } = autoNom;

      logger.info(
        `Nominator ${stash}  ${nominator.isProxy ? "Proxy" : "Non-Proxy"} with delay ${nominator.proxyDelay} blocks  nominate ${nominationNum} validators`,
        scorekeeperLabel,
      );

      if (!config?.scorekeeper?.dryRun) {
        // TODO: Move this check else where as a job
        // Check the free balance of the account. If it doesn't have a free balance, skip.
        const balance = await chaindata.getBalance(nominator.address);
        const metadata = await queries.getChainMetadata();
        if (!metadata || !balance || !balance.free) return null;
        const network = metadata?.name?.toLowerCase();
        const free = Util.toDecimals(Number(balance.free), metadata.decimals);
        // TODO Parameterize this as a constant
        if (free < 0.1) {
          logger.info(
            `Nominator has low free balance: ${free}`,
            scorekeeperLabel,
          );
          bot?.sendMessage(
            `Nominator Account ${Util.addressUrl(
              nominator.address,
              config,
            )} has low free balance: ${free}`,
          );
          continue;
        }
      }

      // Get the target slice based on the amount of nominations to do and increment the counter.
      const targets = allTargets.slice(counter, counter + nominationNum);
      counter = counter + nominationNum;

      if (targets.length == 0) {
        logger.warn(
          `targets length was 0. Skipping nominations`,
          scorekeeperLabel,
        );
        return null;
      }

      await Util.sleep(1000);
      await nominator.nominate(targets.map((t) => t.stash));

      // Wait some time between each transaction to avoid nonce issues.
      await Util.sleep(1000);

      const targetsString = (
        await Promise.all(
          targets.map(async (target) => {
            const candidate = await queries.getCandidateByStash(target.stash);
            const name = candidate?.name || "";
            return `- ${name} (${target})`;
          }),
        )
      ).join("\n");

      if (!stash) continue;
      const name = (await queries.getChainMetadata())?.name;
      const decimals = name == "Kusama" ? 12 : 10;
      const [rawBal, err] = await chaindata.getBondedAmount(stash);
      const bal = Util.toDecimals(rawBal || 0, decimals);
      const sym = name == "Kusama" ? "KSM" : "DOT";

      const targetsHtml = (
        await Promise.all(
          targets.map(async (target) => {
            const name =
              (await queries.getCandidateByStash(target.stash))?.name || "";
            return `- ${name} (${Util.addressUrl(target.stash, config)})`;
          }),
        )
      ).join("<br>");

      logger.info(
        `Nominator ${stash} (${bal} ${sym}) / ${nominator.bondedAddress} nominated:\n${targetsString}`,
      );
      await bot?.sendMessage(
        `Nominator ${Util.addressUrl(stash, config)} (${bal} ${sym}) / 
          ${Util.addressUrl(
            nominator.bondedAddress,
            config,
          )} nominated:<br>${targetsHtml}`,
      );
    }

    logger.info(
      `Number of Validators nominated this round: ${counter}`,
      scorekeeperLabel,
    );
    await bot?.sendMessage(`${counter} Validators nominated this round`);

    currentTargets = allTargets.slice(0, counter);
    const nextTargets = allTargets.slice(counter, allTargets.length);

    const nextTargetsString = (
      await Promise.all(
        nextTargets.map(async (target) => {
          const name =
            (await queries.getCandidateByStash(target.stash))?.name || "";
          return `- ${name} (${target})`;
        }),
      )
    ).join("\n");
    logger.info(`Next targets: \n${nextTargetsString}`, scorekeeperLabel);

    return counter;
  } catch (e) {
    logger.error(e, { message: "Error in doNominations", ...scorekeeperLabel });
    return null;
  }
};
