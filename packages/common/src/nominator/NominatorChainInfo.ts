import Nominator from "./nominator";
import { queries } from "../index";
import { NOMINATOR_SHOULD_NOMINATE_ERAS_THRESHOLD } from "../constants";
import { NominatorState } from "../types";

// Query on-chain info for a nominator
export const getNominatorChainInfo = async (nominator: Nominator) => {
  const stash = await nominator.stash();
  const isBonded = await nominator.chaindata.isBonded(stash);
  const [bonded, err] = await nominator.chaindata.getDenomBondedAmount(stash);
  const currentBlock = (await nominator.chaindata.getLatestBlock()) || 0;

  const currentEra = (await nominator.chaindata.getCurrentEra()) || 0;
  const lastNominationEra =
    (await nominator.chaindata.getNominatorLastNominationEra(stash)) || 0;
  nominator.lastEraNomination = lastNominationEra;
  const currentTargets =
    (await nominator.chaindata.getNominatorCurrentTargets(stash)) || [];
  const currentNamedTargets = await Promise.all(
    currentTargets.map(async (target) => {
      const kyc = await queries.isKYC(target);
      let name = await queries.getIdentityName(target);
      if (!name) {
        name =
          (await nominator.chaindata.getFormattedIdentity(target))?.name || "";
      }

      const scoreResult = await queries.getLatestValidatorScore(target);
      const score = scoreResult && scoreResult.total ? scoreResult.total : 0;

      return {
        stash: target,
        name: name || "",
        kyc: kyc || false,
        score: score,
      };
    }),
  );

  const proxyAnnouncements = await queries.getAccountDelayedTx(
    nominator.bondedAddress,
  );

  const namedProxyTargets = await Promise.all(
    (proxyAnnouncements || []).map(async (announcement) => {
      const namedTargets = await Promise.all(
        announcement.targets.map(async (target) => {
          const kyc = await queries.isKYC(target);
          let name = await queries.getIdentityName(target);

          if (!name) {
            const formattedIdentity =
              await nominator.chaindata.getFormattedIdentity(target);
            name = formattedIdentity?.name || "";
          }

          const scoreResult = await queries.getLatestValidatorScore(target);
          const score =
            scoreResult && scoreResult.total ? scoreResult.total : 0;

          return {
            stash: target,
            name: name || "",
            kyc: kyc || false,
            score: score,
          };
        }),
      );
      const executionMsTime =
        (nominator.proxyDelay + currentBlock - announcement.number) * 6 * 1000;
      return {
        ...announcement,
        targets: namedTargets,
        executionTime: executionMsTime,
      };
    }),
  );

  const shouldNominate =
    bonded > 50 &&
    isBonded &&
    currentEra - lastNominationEra >=
      NOMINATOR_SHOULD_NOMINATE_ERAS_THRESHOLD &&
    proxyAnnouncements.length == 0;

  let status;

  if (namedProxyTargets.length > 0) {
    `Pending Proxy Execution at #${namedProxyTargets[0].number}`;
  } else if (shouldNominate) {
    status = "Awaiting New Nomination";
  } else if (lastNominationEra == 0) {
    status = "Not Nominating Anyone";
  } else {
    status = `Nominating, last nomination era: ${lastNominationEra} current era: ${currentEra}`;
  }

  let state;
  if (shouldNominate) {
    state = NominatorState.ReadyToNominate;
  } else if (namedProxyTargets.length > 0) {
    state = NominatorState.AwaitingProxyExecution;
  } else if (lastNominationEra == 0) {
    state = NominatorState.NotNominating;
  } else if (namedProxyTargets.length == 0 && lastNominationEra > 0) {
    state = NominatorState.Nominated;
  }

  const stale =
    isBonded &&
    currentEra - lastNominationEra > 8 &&
    proxyAnnouncements.length == 0 &&
    bonded > 50;

  return {
    state: state,
    status: status,
    isBonded: isBonded,
    bondedAmount: Number(bonded),
    lastNominationEra: lastNominationEra,
    currentTargets: currentNamedTargets,
    proxyAnnouncements: namedProxyTargets,
    shouldNominate: shouldNominate,
    stale: stale,
  };
};
