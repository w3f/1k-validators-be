// Start nominations for all nominator groups:
// - For each nominator group - if they have current targets, wipe them
// - Determine the number of nominations to make for each nominator account
//     - This will either be a static number, or "auto"
import { logger, queries, Util } from "@1kv/common";
import { autoNumNominations } from "./NumNominations";
import { scorekeeperLabel, SpawnedNominatorGroup } from "./scorekeeper";

export const doNominations = async (
  candidates: { name: string; stash: string; total: number }[],
  nominatorGroups: SpawnedNominatorGroup[] = [],
  chaindata,
  handler,
  bot,
  config,
  currentTargets,
): Promise<any> => {
  if (candidates.length == 0) {
    logger.warn(
      `Candidates length was 0. Skipping nominations`,
      scorekeeperLabel,
    );
    return;
  }

  const allTargets = candidates.map((c) => c.stash);
  let counter = 0;
  for (const nomGroup of nominatorGroups) {
    // ensure the group is sorted by least avg stake
    for (const nominator of nomGroup) {
      // The number of nominations to do per nominator account
      // This is either hard coded, or set to "auto", meaning it will find a dynamic amount of validators
      //    to nominate based on the lowest staked validator in the validator set
      const api = handler.getApi();
      const denom = await chaindata.getDenom();
      const autoNom = await autoNumNominations(api, nominator);
      const { nominationNum } = autoNom;
      const stash = await nominator.stash();
      // Planck Denominated Bonded Amount
      const [currentBondedAmount, bondErr] =
        await chaindata.getBondedAmount(stash);

      // Check the free balance of the account. If it doesn't have a free balance, skip.
      const balance = await chaindata.getBalance(nominator.address);
      const metadata = await queries.getChainMetadata();
      const network = metadata.name.toLowerCase();
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

      // Get the target slice based on the amount of nominations to do and increment the counter.
      const targets = allTargets.slice(counter, counter + nominationNum);
      counter = counter + nominationNum;

      if (targets.length == 0) {
        logger.warn(
          `targets length was 0. Skipping nominations`,
          scorekeeperLabel,
        );
        return;
      }

      await Util.sleep(10000);
      await nominator.nominate(targets);

      // Wait some time between each transaction to avoid nonce issues.
      await Util.sleep(16000);

      const targetsString = (
        await Promise.all(
          targets.map(async (target) => {
            const candidate = await queries.getCandidate(target);
            const name = candidate.name;
            return `- ${name} (${target})`;
          }),
        )
      ).join("\n");

      if (!stash) continue;
      const name = (await queries.getChainMetadata()).name;
      const decimals = name == "Kusama" ? 12 : 10;
      const [rawBal, err] = await chaindata.getBondedAmount(stash);
      const bal = Util.toDecimals(rawBal, decimals);
      const sym = name == "Kusama" ? "KSM" : "DOT";

      const targetsHtml = (
        await Promise.all(
          targets.map(async (target) => {
            const name = (await queries.getCandidate(target)).name;
            return `- ${name} (${Util.addressUrl(target, config)})`;
          }),
        )
      ).join("<br>");

      logger.info(
        `Nominator ${stash} (${bal} ${sym}) / ${nominator.bondedAddress} nominated:\n${targetsString}`,
      );
      bot?.sendMessage(
        `Nominator ${Util.addressUrl(stash, config)} (${bal} ${sym}) / 
          ${Util.addressUrl(
            nominator.bondedAddress,
            config,
          )} nominated:<br>${targetsHtml}`,
      );
    }
  }

  logger.info(
    `Number of Validators nominated this round: ${counter}`,
    scorekeeperLabel,
  );
  bot?.sendMessage(`${counter} Validators nominated this round`);

  currentTargets = allTargets.slice(0, counter);
  const nextTargets = allTargets.slice(counter, allTargets.length);

  const nextTargetsString = (
    await Promise.all(
      nextTargets.map(async (target) => {
        const name = (await queries.getCandidate(target)).name;
        return `- ${name} (${target})`;
      }),
    )
  ).join("\n");
  logger.info(`Next targets: \n${nextTargetsString}`, scorekeeperLabel);

  return counter;
};
