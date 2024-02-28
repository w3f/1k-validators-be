import { logger, queries } from "../index";

import Chaindata from "../chaindata/chaindata";
import { scorekeeperLabel } from "../scorekeeper/scorekeeper";

export const setAllIdentities = async (
  chaindata: Chaindata,
  label?: {
    label: string;
  },
): Promise<boolean> => {
  try {
    const candidates = await queries.allCandidates();
    logger.info(
      `[Begin] Setting ${candidates.length} Candidate Identities.....`,
      label,
    );
    // Set all candidate identities
    for (const [index, candidate] of candidates.entries()) {
      logger.info(
        `[Begin] Setting Candidate Identity: ${candidate.name} (${index + 1}/${candidates.length})`,
        scorekeeperLabel,
      );
      const identity = await chaindata.getFormattedIdentity(candidate.stash);
      if (identity) {
        await queries.setCandidateIdentity(candidate.stash, identity);
      }
    }
    return true;
  } catch (e) {
    logger.error(`Error setting identities: ${e}`, label);
    return false;
  }
};
