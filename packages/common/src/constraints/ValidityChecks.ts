// Checks the online validity of a node
import {
  Candidate,
  getLatestRelease,
  setBeefyKeysInvalidity,
  setBlockedInvalidity,
  setCommissionInvalidity,
  setConnectionTimeInvalidity,
  setIdentityInvalidity,
  setKusamaRankInvalidity,
  setLatestClientReleaseValidity,
  setOfflineAccumulatedInvalidity,
  setOnlineValidity,
  setProviderInvalidity,
  setSelfStakeInvalidity,
  setUnclaimedInvalidity,
  setValidateIntentionValidity,
  setSanctionedGeoAreaValidity,
} from "../db";
import { ChainData, Config, Constants, queries, Util } from "../index";
import axios from "axios";
import semver from "semver";
import logger from "../logger";
import { constraintsLabel } from "./constraints";
import { getLatestTaggedRelease } from "../scorekeeper/jobs/specificJobs";

export const checkOnline = async (candidate: Candidate): Promise<boolean> => {
  try {
    const now = new Date().getTime();
    if (now - candidate.onlineSince > Constants.SIXTEEN_HOURS) {
      //TODO: reduce it after a first test
      await setOnlineValidity(candidate.slotId, false);
      return false;
    } else {
      await setOnlineValidity(candidate.slotId, true);
      return true;
    }
  } catch (e) {
    logger.error(`Error checking online status: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

// Check the validate intention for a single validator
export const checkValidateIntention = async (
  config: Config.ConfigSchema,
  chaindata: ChainData,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const validators = await chaindata.getValidators();
    if (
      !validators?.length ||
      validators.includes(Util.formatAddress(candidate?.stash, config))
    ) {
      await setValidateIntentionValidity(candidate, true);
      return true;
    }

    await setValidateIntentionValidity(candidate, false);
    return false;
  } catch (e) {
    logger.error(`Error checking validate intention: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

// checks the validate intention for all validators
export const checkAllValidateIntentions = async (
  config: Config.ConfigSchema,
  chaindata: ChainData,
  candidates: Candidate[],
): Promise<boolean> => {
  try {
    const validators = await chaindata.getValidators();
    for (const candidate of candidates) {
      if (!validators.includes(Util.formatAddress(candidate.stash, config))) {
        await setValidateIntentionValidity(candidate, false);
      } else {
        await setValidateIntentionValidity(candidate, true);
      }
    }
    return true;
  } catch (e) {
    logger.error(`Error checking validate intentions: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

// checks that the validator is on the latest client version
export const checkLatestClientVersion = async (
  config: Config.ConfigSchema,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const skipClientUpgrade = config.constraints?.skipClientUpgrade || false;
    if (skipClientUpgrade || candidate?.implementation === "Kagome Node") {
      // Skip the check if the node is a Kagome Client or if skipping client upgrade is enabled
      await setLatestClientReleaseValidity(candidate, true);
      return true;
    }

    // The latest release that is manually set in the config (set if there's reasons for people to downgrade)
    const forceLatestRelease = config.constraints.forceClientVersion;

    // Get the latest release from the db or github
    let latestRelease = await getLatestRelease();
    if (!latestRelease) {
      logger.info(
        `No latest release found, fetching from GitHub`,
        constraintsLabel,
      );
      // fetch from github and set in the db
      await getLatestTaggedRelease();
      // get the record from the db
      latestRelease = await getLatestRelease();
      logger.info(
        `Latest release fetched from GitHub: ${latestRelease}`,
        constraintsLabel,
      );
    }

    // Ensure latestRelease contains a valid name
    if (!latestRelease || !latestRelease.name) {
      logger.error(
        `Latest release name is null or undefined: ${latestRelease}`,
        constraintsLabel,
      );
      return false;
    }

    // Check if there is a latest release and if the current time is past the grace window
    const isPastGraceWindow =
      Date.now() > latestRelease.publishedAt + Constants.FORTY_EIGHT_HOURS;

    if (isPastGraceWindow) {
      const nodeVersion = semver.coerce(candidate.version);
      const latestVersion = forceLatestRelease
        ? semver.clean(forceLatestRelease)
        : semver.clean(latestRelease.name);

      logger.info(
        `Past grace window of latest release, checking latest client version: ${nodeVersion} >= ${latestVersion}`,
        constraintsLabel,
      );

      // If cannot parse the version, set the release as invalid
      if (!nodeVersion || !latestVersion) {
        await setLatestClientReleaseValidity(candidate, false);
        return false;
      }

      const isUpgraded = semver.gte(nodeVersion, latestVersion);

      // If they are not upgraded, set the validity as invalid
      if (!isUpgraded) {
        await setLatestClientReleaseValidity(candidate, false);
        return false;
      }

      // If the current version is the latest release, set the release as valid
      await setLatestClientReleaseValidity(candidate, true);
      return true;
    } else {
      logger.info(`Still in grace window of latest release`, constraintsLabel);

      // If not past the grace window, set the release as invalid
      await setLatestClientReleaseValidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.error(
      `Error checking latest client version: ${e}`,
      constraintsLabel,
    );
    await setLatestClientReleaseValidity(candidate, false);
    throw new Error("could not make validity check");
  }
};

export const checkConnectionTime = async (
  config: Config.ConfigSchema,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    if (!config?.constraints?.skipConnectionTime) {
      const now = new Date().getTime();
      if (now - candidate.discoveredAt < Constants.WEEK) {
        await setConnectionTimeInvalidity(candidate, false);
        return false;
      } else {
        await setConnectionTimeInvalidity(candidate, true);
        return true;
      }
    } else {
      await setConnectionTimeInvalidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.error(`Error checking connection time: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

export const checkIdentity = async (
  chaindata: ChainData,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const [hasIdentity, verified] = await chaindata.hasIdentity(
      candidate.stash,
    );
    if (!hasIdentity) {
      const invalidityString = `${candidate.name} does not have an identity set.`;
      await setIdentityInvalidity(candidate, false, invalidityString);
      return false;
    }
    if (!verified) {
      const invalidityString = `${candidate.name} has an identity but is not verified by the registrar.`;
      await setIdentityInvalidity(candidate, false, invalidityString);
      return false;
    }
    await setIdentityInvalidity(candidate, true);
    return true;
  } catch (e) {
    logger.error(`Error checking identity: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

export const checkOffline = async (candidate: Candidate): Promise<boolean> => {
  try {
    const totalOffline = candidate.offlineAccumulated / Constants.WEEK;
    if (totalOffline > 0.02) {
      await setOfflineAccumulatedInvalidity(candidate, false);
      return false;
    } else {
      await setOfflineAccumulatedInvalidity(candidate, true);
      return true;
    }
    return true;
  } catch (e) {
    logger.error(`Error checking offline: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};
export const checkCommission = async (
  chaindata: ChainData,
  targetCommission: number,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const [commission, err] = await chaindata.getCommission(candidate.stash);
    if (err) {
      logger.warn(`{CheckComssion} there was an error: ${err}`);
      return false;
    }
    if (commission > targetCommission) {
      const invalidityString = `${
        candidate.name
      } commission is set higher than the maximum allowed. Set: ${
        commission / Math.pow(10, 7)
      }% Allowed: ${targetCommission / Math.pow(10, 7)}%`;
      await setCommissionInvalidity(candidate, false, invalidityString);
      return false;
    } else {
      await setCommissionInvalidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.error(`Error checking commission: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

export const checkSelfStake = async (
  chaindata: ChainData,
  targetSelfStake: number,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    if (!candidate.skipSelfStake) {
      const [bondedAmt, err2] = await chaindata.getBondedAmount(
        candidate.stash,
      );
      let invalidityString;
      if (err2) {
        invalidityString = `${candidate.name} ${err2}`;
        await setSelfStakeInvalidity(candidate, false, invalidityString);
        return false;
      }
      if (parseInt(bondedAmt.toString()) < targetSelfStake) {
        invalidityString = `${
          candidate.name
        } has less than the minimum amount bonded: ${parseInt(
          bondedAmt.toString(),
        )} is bonded.`;
        await setSelfStakeInvalidity(candidate, false, invalidityString);
        return false;
      }
    }
    await setSelfStakeInvalidity(candidate, true);
    return true;
  } catch (e) {
    logger.error(`Error checking self stake: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

export const checkUnclaimed = async (
  chaindata: ChainData,
  unclaimedEraThreshold: number,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const [currentEra, err3] = await chaindata.getActiveEraIndex();
    const threshold = currentEra - unclaimedEraThreshold - 1; // Validators cannot have unclaimed rewards before this era
    // If unclaimed eras contain an era below the recent threshold
    if (
      candidate.unclaimedEras &&
      !candidate.unclaimedEras.every((era) => era > threshold)
    ) {
      const invalidityString = `${candidate.name} has unclaimed eras: ${
        candidate.unclaimedEras
      } prior to era: ${threshold + 1}`;
      await setUnclaimedInvalidity(candidate, false, invalidityString);
      return false;
    } else {
      await setUnclaimedInvalidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.error(`Error checking unclaimed: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

// Checks if the validator blocks external nominations
export const checkBlocked = async (
  chaindata: ChainData,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const isBlocked = await chaindata.getBlocked(candidate.stash);
    if (isBlocked) {
      const invalidityString = `${candidate.name} blocks external nominations`;
      await setBlockedInvalidity(candidate, false, invalidityString);
      return false;
    } else {
      await setBlockedInvalidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.error(`Error checking blocked: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

// Checks if the candidate has a banned infrastructure provider
export const checkProvider = async (
  config: Config.ConfigSchema,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const location = await queries.getCandidateLocation(candidate.slotId);
    if (location && location.provider) {
      const bannedProviders = config.telemetry?.blacklistedProviders;
      if (bannedProviders?.includes(location.provider)) {
        logger.info(
          `${candidate.name} has banned provider: ${location.provider}`,
          {
            label: "Constraints",
          },
        );
        await setProviderInvalidity(candidate, false);
        return false;
      } else {
        await setProviderInvalidity(candidate, true);
        return true;
      }
    } else {
      await setProviderInvalidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.error(`Error checking provider: ${e}`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

export const checkKusamaRank = async (
  candidate: Candidate,
): Promise<boolean> => {
  try {
    if (!candidate.skipSelfStake || !!candidate.kusamaStash) {
      const url = `${Constants.KOTVBackendEndpoint}/candidate/${candidate.kusamaStash}`;

      const res = await axios.get(url);

      if (!!res.data.invalidityReasons) {
        const invalidityReason = `${candidate.name} has a kusama node that is invalid: ${res.data.invalidityReasons}`;
        await setKusamaRankInvalidity(candidate, false, invalidityReason);
        return false;
      }

      if (Number(res.data.rank) < Constants.KUSAMA_RANK_VALID_THRESHOLD) {
        const invalidityReason = `${candidate.name} has a Kusama stash with lower than 25 rank in the Kusama OTV programme: ${res.data.rank}.`;
        await setKusamaRankInvalidity(candidate, false, invalidityReason);
        return false;
      }
    }
    await setKusamaRankInvalidity(candidate, true);
    return true;
  } catch (e) {
    logger.warn(`Error trying to get kusama data...`);
    throw new Error("could not make validity check");
  }
};

export const checkBeefyKeys = async (
  candidate: Candidate,
): Promise<boolean> => {
  try {
    const isDummy = await queries.hasBeefyDummy(candidate.stash);
    if (isDummy) {
      const invalidityString = `${candidate.name} has not set beefy keys`;
      await setBeefyKeysInvalidity(candidate, false, invalidityString);
      return false;
    } else {
      await setBeefyKeysInvalidity(candidate, true);
      return true;
    }
  } catch (e) {
    logger.warn(`Error trying to get beefy keys...`, constraintsLabel);
    throw new Error("could not make validity check");
  }
};

// Checks if the candidate is in a sanctioned location
export const checkSanctionedGeoArea = async (
  config: Config.ConfigSchema,
  candidate: Candidate,
): Promise<boolean> => {
  try {
    if (
      !config.constraints?.sanctionedGeoArea?.sanctionedCountries?.length &&
      !config.constraints?.sanctionedGeoArea?.sanctionedRegions?.length
    ) {
      await setSanctionedGeoAreaValidity(candidate, true);
      return true;
    }

    const location = await queries.getCandidateLocation(candidate.slotId);
    if (!location?.region || !location?.country) {
      await setSanctionedGeoAreaValidity(candidate, true);
      return true;
    }

    const sanctionedCountries = config.constraints?.sanctionedGeoArea
      ?.sanctionedCountries
      ? config.constraints.sanctionedGeoArea.sanctionedCountries.map((x) =>
          x.trim().toLowerCase(),
        )
      : [];
    const sanctionedRegions = config.constraints?.sanctionedGeoArea
      ?.sanctionedRegions
      ? config.constraints.sanctionedGeoArea.sanctionedRegions.map((x) =>
          x.trim().toLowerCase(),
        )
      : [];

    if (
      sanctionedCountries.includes(location.country.trim().toLowerCase()) ||
      sanctionedRegions.includes(location.region.trim().toLowerCase())
    ) {
      logger.info(
        `${candidate.name} is in a sanctioned location: Country: ${location.country}, Region: ${location.region}`,
        {
          label: "Constraints",
        },
      );
      await setSanctionedGeoAreaValidity(candidate, false);
      return false;
    }

    await setSanctionedGeoAreaValidity(candidate, true);
    return true;
  } catch (e) {
    logger.error(
      `Error checking location for sanctions: ${e}`,
      constraintsLabel,
    );
    throw new Error("could not make validity check");
  }
};
