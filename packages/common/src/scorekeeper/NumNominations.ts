/**
 * Functions for calculating the number of nominations to be done for a given nominator account
 *
 * @function NumNominations
 */
import { ApiPromise } from "@polkadot/api";
import { scorekeeperLabel } from "./scorekeeper";
import Nominator, { NominatorStatus } from "../nominator/nominator";
import { Constants } from "../index";
import logger from "../logger";

/**
 * Automatically determines the number of validators a nominator can nominate based on their available balance
 * and the current staking environment in the Polkadot network. It takes into consideration the chain's denomination,
 * the nominator's total balance (free + reserved), and a buffer to ensure some balance remains free. The function
 * then queries the current elected validators, calculates the total stake required to nominate a certain number of
 * validators by considering the lowest staked validators first, and adjusts the nomination count based on a specified
 * buffer percentage and additional nominations desired. This function is chain-aware and adjusts its logic and limits
 * based on whether it's operating on Polkadot or another chain.
 *
 * @param {ApiPromise} api - An instance of the ApiPromise from Polkadot.js API, connected to the target chain.
 * @param {Nominator} nominator - An object representing the nominator, including methods to get the stash account and nominate validators.
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 * - `nominationNum`: The number of validators the nominator should nominate.
 * - `newBondedAmount`: The total amount of funds the nominator should have bonded.
 * - `targetValStake`: The target amount of stake per validator.
 * @throws {Error} If the stash account cannot be found or other API calls fail.
 * @example
 * const api = await ApiPromise.create({ provider: wsProvider });
 * const nominator = new Nominator(stashId, api);
 * const nominationInfo = await autoNumNominations(api, nominator);
 * console.log(`Nominator can nominate ${nominationInfo.nominationNum} validators.`);
 */
export const autoNumNominations = async (
  api: ApiPromise,
  nominator: Nominator,
): Promise<any> => {
  const nominatorStatus: NominatorStatus = {
    status: `Calculating how many validators to nominate...`,
    updated: Date.now(),
    stale: false,
  };
  nominator.updateNominatorStatus(nominatorStatus);

  const denom = (await nominator?.chaindata?.getDenom()) || 0;

  // Get the full nominator stash balance (free + reserved)
  const stash = await nominator.stash();
  if (!stash) return 0;
  const stashQuery = await api.query.system.account(stash);

  const stashBal =
    // @ts-ignore
    (parseFloat(stashQuery.data.free) + parseFloat(stashQuery.data.reserved)) /
    denom;

  // get the balance minus a buffer to remain free
  const bufferedBalance =
    stashBal -
    Math.max(
      Constants.BALANCE_BUFFER_PERCENT * stashBal,
      Constants.BALANCE_BUFFER_AMOUNT,
    );

  // Query the staking info of the validator set
  const query = await api.derive.staking.electedInfo();
  const { info } = query;

  const totalStakeAmounts = [];

  // add formatted totals to list
  for (const validator of info) {
    const { exposure } = validator;
    const { total, own, others } = exposure;

    const totalValue = total.unwrap();

    const formattedTotal = parseFloat(totalValue.toBigInt().toString()) / denom;

    if (formattedTotal > 0) {
      totalStakeAmounts.push(formattedTotal);
    }
  }

  const sorted = totalStakeAmounts.sort((a, b) => a - b);

  let sum = 0;
  let amount = 1;

  // Loop until we find the amount of validators that the account can get in.

  while (sum < bufferedBalance) {
    // An offset so the slice isn't the immediate lowest validators in the set
    const offset = 5;
    const lowestNum = sorted.slice(offset, offset + amount);
    sum = lowestNum.reduce((a, b) => a + b, 0);

    if (sum < bufferedBalance) {
      amount++;
    } else {
      amount--;
      const lowestNum = sorted.slice(offset, offset + amount);
      sum = lowestNum.reduce((a, b) => a + b, 0);
      break;
    }
  }

  // How many additional validator to nominate above the amount to get in the set
  const additional = 1;

  const maxNominations = 24;
  // The total amount of validators to nominate
  const adjustedNominationAmount = Math.min(
    Math.ceil(amount * additional),
    maxNominations,
  );

  logger.info(
    `Auto Nominations - stash: ${stash} with balance ${stashBal} can elect ${adjustedNominationAmount} validators`,
    scorekeeperLabel,
  );
  const nominatorStatus: NominatorStatus = {
    status: `Going to nominate ${adjustedNominationAmount} validators`,
    updated: Date.now(),
    stale: false,
  };
  nominator.updateNominatorStatus(nominatorStatus);

  return {
    nominationNum: adjustedNominationAmount || 1,
  };
};
