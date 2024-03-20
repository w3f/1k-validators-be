import {
  AccountingModel,
  allTelemetryNodes,
  cleanBlankLocations,
  cleanLocationsWithoutSlotId,
  cleanOldLocations,
  cleanOldNominatorStakes,
  clearTelemetryNodeNodeRefsFrom,
  ConvictionVoteModel,
  CouncillorModel,
  dbLabel,
  DelegationModel,
  deleteAllIdentities,
  deleteOldCandidateFields,
  EraPaidEventModel,
  OpenGovDelegateModel,
  OpenGovDelegationModel,
  OpenGovReferendumModel,
  OpenGovReferendumStatsModel,
  OpenGovTrackModel,
  OpenGovVoterModel,
  RankEventModel,
  ReferendumModel,
  ReferendumVoteModel,
  removeStaleNominators,
  SessionModel,
  UpdatingDelegationsModel,
} from "../db";
import logger from "../logger";
import { queries } from "../index";
import ScoreKeeper from "../scorekeeper/scorekeeper";

export const cleanDB = async (scorekeeper?: ScoreKeeper): Promise<boolean> => {
  try {
    // Delete Records for deprecated models
    // TODO: delete block of code after removing models
    await deleteAllAccountingRecords();
    await deleteAllRankEventRecords();
    await deleteAllUpdatingDelegationsModelRecords();
    await deleteAllDelegationsModelRecords();
    await deleteAllOpenGovDelegationRecords();
    await deleteAllCouncillorRecords();
    await deleteAllEraPaidRecords();
    await deleteAllReferendumRecords();
    await deleteAllReferendumVoteRecords();
    await deleteAllConvictionVoteRecords();
    await deleteAllOpenGovReferendumRecords();
    await deleteAllOpenGovReferendumStatsRecords();
    await deleteAllOpenGovVoterRecords();
    await deleteAllOpenGovDelegateRecords();
    await deleteAllOpenGovTrackRecords();
    await deleteAllEraInfoRecords();
    await deleteAllSessionRecords();
    await deleteAllEraRewardRecords();

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
  } catch (error) {
    logger.error(`Error cleaning DB: ${JSON.stringify(error)}`, dbLabel);
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllAccountingRecords = async (): Promise<boolean> => {
  try {
    const result = await AccountingModel.deleteMany({});

    logger.info(`${result.deletedCount} accounting records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting accounting records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllRankEventRecords = async (): Promise<boolean> => {
  try {
    const result = await RankEventModel.deleteMany({});

    logger.info(`${result.deletedCount} rank event records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting rank event records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllUpdatingDelegationsModelRecords =
  async (): Promise<boolean> => {
    try {
      const result = await UpdatingDelegationsModel.deleteMany({});

      logger.info(
        `${result.deletedCount} updating delegation records deleted.`,
        dbLabel,
      );
      return true;
    } catch (error) {
      logger.error(
        `Error deleting updating delegation records: ${JSON.stringify(error)}`,
        dbLabel,
      );
      return false;
    }
  };

// TODO: delete after deleting model
export const deleteAllDelegationsModelRecords = async (): Promise<boolean> => {
  try {
    const result = await DelegationModel.deleteMany({});

    logger.info(`${result.deletedCount} delegation records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting delegation records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllOpenGovDelegationRecords = async (): Promise<boolean> => {
  try {
    const result = await OpenGovDelegationModel.deleteMany({});

    logger.info(
      `${result.deletedCount} open gov delegation records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting open gov delegation records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllCouncillorRecords = async (): Promise<boolean> => {
  try {
    const result = await CouncillorModel.deleteMany({});

    logger.info(`${result.deletedCount} counciller records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting councillor records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllEraPaidRecords = async (): Promise<boolean> => {
  try {
    const result = await EraPaidEventModel.deleteMany({});

    logger.info(`${result.deletedCount} era paid records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting era paid records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllReferendumRecords = async (): Promise<boolean> => {
  try {
    const result = await ReferendumModel.deleteMany({});

    logger.info(`${result.deletedCount} referendum records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting referendum records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllReferendumVoteRecords = async (): Promise<boolean> => {
  try {
    const result = await ReferendumVoteModel.deleteMany({});

    logger.info(
      `${result.deletedCount} referendum vote records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting referendum vote records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllConvictionVoteRecords = async (): Promise<boolean> => {
  try {
    const result = await ConvictionVoteModel.deleteMany({});

    logger.info(
      `${result.deletedCount} conviction vote records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting conviction vote records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllOpenGovReferendumRecords = async (): Promise<boolean> => {
  try {
    const result = await OpenGovReferendumModel.deleteMany({});

    logger.info(
      `${result.deletedCount} open gov referendum records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting open gove referendum records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

export const deleteAllOpenGovReferendumStatsRecords =
  async (): Promise<boolean> => {
    try {
      const result = await OpenGovReferendumStatsModel.deleteMany({});

      logger.info(
        `${result.deletedCount} open gov referendum stats records deleted.`,
        dbLabel,
      );
      return true;
    } catch (error) {
      logger.error(
        `Error deleting open gove referendum records: ${JSON.stringify(error)}`,
        dbLabel,
      );
      return false;
    }
  };

// TODO: delete after deleting model
export const deleteAllOpenGovVoterRecords = async (): Promise<boolean> => {
  try {
    const result = await OpenGovVoterModel.deleteMany({});

    logger.info(
      `${result.deletedCount} open gov voter  records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting open gov voter records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllOpenGovDelegateRecords = async (): Promise<boolean> => {
  try {
    const result = await OpenGovDelegateModel.deleteMany({});

    logger.info(
      `${result.deletedCount} open gov delegate  records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting open gov delegate records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllOpenGovTrackRecords = async (): Promise<boolean> => {
  try {
    const result = await OpenGovTrackModel.deleteMany({});

    logger.info(
      `${result.deletedCount} open gov track records deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(
      `Error deleting open gov track records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllEraInfoRecords = async (): Promise<boolean> => {
  try {
    const result = await OpenGovTrackModel.deleteMany({});

    logger.info(`${result.deletedCount} era info records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting era info records: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllSessionRecords = async (): Promise<boolean> => {
  try {
    const result = await SessionModel.deleteMany({});

    logger.info(`${result.deletedCount} session records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting sessionrecords: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

// TODO: delete after deleting model
export const deleteAllEraRewardRecords = async (): Promise<boolean> => {
  try {
    const result = await SessionModel.deleteMany({});

    logger.info(`${result.deletedCount} era reward records deleted.`, dbLabel);
    return true;
  } catch (error) {
    logger.error(
      `Error deleting era reward : ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};
