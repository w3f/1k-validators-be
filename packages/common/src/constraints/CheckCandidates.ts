import { logger } from "../index";
import { allCandidates, Candidate, setLastValid, setValid } from "../db";
import { constraintsLabel, OTV } from "./constraints";
import {
  checkBeefyKeys,
  checkBlocked,
  checkCommission,
  checkConnectionTime,
  checkIdentity,
  checkKusamaRank,
  checkLatestClientVersion,
  checkOffline,
  checkOnline,
  checkProvider,
  checkSelfStake,
  checkUnclaimed,
  checkValidateIntention,
  checkSanctionedGeoArea,
} from "./ValidityChecks";
import { percentage, timeRemaining } from "../utils/util";

export const checkCandidate = async (
  constraints: OTV,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    let valid = false;

    const onlineValid = await checkOnline(candidate);
    if (!onlineValid) {
      logger.info(`${candidate.name} online not valid`, constraintsLabel);
    }

    const validateValid = await checkValidateIntention(
      constraints.config,
      constraints.chaindata,
      candidate,
    );
    if (!validateValid) {
      logger.info(
        `${candidate.name} validate intention not valid`,
        constraintsLabel,
      );
    }

    const versionValid = await checkLatestClientVersion(
      constraints.config,
      candidate,
    );
    if (!versionValid) {
      logger.info(`${candidate.name} version not valid`, constraintsLabel);
    }

    const monitoringWeekValid = await checkConnectionTime(
      constraints.config,
      candidate,
    );
    if (!monitoringWeekValid) {
      logger.info(
        `${candidate.name} monitoring week not valid`,
        constraintsLabel,
      );
    }

    const identityValid = await checkIdentity(constraints.chaindata, candidate);
    if (!identityValid) {
      logger.info(`${candidate.name} identity not valid`, constraintsLabel);
    }

    const offlineValid = await checkOffline(candidate);
    if (!offlineValid) {
      logger.info(`${candidate.name} offline not valid`, constraintsLabel);
    }

    const commissionValid =
      (await checkCommission(
        constraints.chaindata,
        constraints.commission,
        candidate,
      )) || false;
    if (!commissionValid) {
      logger.info(`${candidate.name} commission not valid`, constraintsLabel);
    }

    const selfStakeValid =
      (await checkSelfStake(
        constraints.chaindata,
        constraints.minSelfStake,
        candidate,
      )) || false;
    if (!selfStakeValid) {
      logger.info(`${candidate.name} self stake not valid`, constraintsLabel);
    }

    const unclaimedValid =
      constraints.config?.constraints?.skipUnclaimed == true
        ? true
        : (await checkUnclaimed(
            constraints.chaindata,
            constraints.unclaimedEraThreshold,
            candidate,
          )) || false;

    const blockedValid =
      (await checkBlocked(constraints.chaindata, candidate)) || false;
    if (!blockedValid) {
      logger.info(`${candidate.name} blocked not valid`, constraintsLabel);
    }

    let kusamaValid = true;
    try {
      if (!!candidate.kusamaStash) {
        kusamaValid = (await checkKusamaRank(candidate)) || false;
      }
    } catch (e) {
      logger.info(`Error trying to get kusama data...`);
    }
    if (!kusamaValid) {
      logger.info(`${candidate.name} kusama not valid`, constraintsLabel);
    }

    const providerValid =
      (await checkProvider(constraints.config, candidate)) || false;
    if (!providerValid) {
      logger.info(`${candidate.name} provider not valid`, constraintsLabel);
    }

    const beefyValid = await checkBeefyKeys(candidate);
    if (!beefyValid) {
      logger.info(`${candidate.name} beefy keys not valid`, constraintsLabel);
    }

    const sanctionedGeoAreaValid =
      constraints.config?.constraints?.sanctionedGeoArea?.skip == true
        ? true
        : (await checkSanctionedGeoArea(constraints.config, candidate)) ||
          false;

    valid =
      onlineValid &&
      validateValid &&
      versionValid &&
      monitoringWeekValid &&
      identityValid &&
      offlineValid &&
      commissionValid &&
      selfStakeValid &&
      unclaimedValid &&
      blockedValid &&
      kusamaValid &&
      providerValid &&
      beefyValid &&
      sanctionedGeoAreaValid;

    await setValid(candidate, valid);

    if (valid) {
      await setLastValid(candidate);
    }
    return valid;
  } catch (e) {
    logger.error(JSON.stringify(e));
    return false;
  }
};

export const checkAllCandidates = async (
  constraints: OTV,
): Promise<boolean> => {
  try {
    const candidates = await allCandidates();
    logger.info(`checking ${candidates.length} candidates`, constraintsLabel);
    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      const isValid = await constraints.checkCandidate(candidate);
      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(
        index + 1,
        candidates.length,
        end - start,
      );
      logger.info(
        `checked ${candidate.name}: ${isValid} [${index + 1}/${
          candidates.length
        }] ${percentage(index + 1, candidates.length)} ${time} ${remaining}`,
        constraintsLabel,
      );
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    return false;
  }
};
