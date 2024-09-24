import {
  allTelemetryNodes,
  cleanBlankLocations,
  cleanLocationsWithoutSlotId,
  cleanOldLocations,
  cleanOldNominatorStakes,
  clearTelemetryNodeNodeRefsFrom,
  dbLabel,
  deleteAllIdentities,
  deleteOldCandidateFields,
  removeStaleNominators,
} from "../db";
import logger from "../logger";
import { queries } from "../index";
import ScoreKeeper from "../scorekeeper/scorekeeper";

export const cleanDB = async (scorekeeper?: ScoreKeeper): Promise<boolean> => {
  try {
    // Routinely clean the DB of records that are old, or have missing fields
    await deleteOldCandidateFields();
    await cleanLocationsWithoutSlotId();
    await cleanBlankLocations();
    await cleanOldLocations();
    await cleanOldNominatorStakes();
    await deleteAllIdentities();

    // Reset node refs
    const telemetryNodes = await allTelemetryNodes();

    for (const node of telemetryNodes) {
      await clearTelemetryNodeNodeRefsFrom(node.name);
    }

    // Clear node refs and delete old fields from all candidate nodes
    const allCandidates = await queries.allCandidates();
    for (const [index, node] of allCandidates.entries()) {
      const { name } = node;
      await queries.deleteOldFieldFrom(name);
      await queries.clearCandidateNodeRefsFrom(name);
    }

    if (scorekeeper) {
      const bondedAddresses = scorekeeper.getAllNominatorBondedAddresses();
      await removeStaleNominators(bondedAddresses);
    }

    return true;
  } catch (e) {
    logger.error(e, { message: "Error cleaning DB", ...dbLabel });
    return false;
  }
};
