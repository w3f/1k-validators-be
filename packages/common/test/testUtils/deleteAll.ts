import {
  BeefyStatsModel,
  BlockIndexModel,
  CandidateModel,
  ChainMetadataModel,
  DelayedTxModel,
  EraModel,
  EraPointsModel,
  EraStatsModel,
  HeartbeatIndexModel,
  IdentityModel,
  IITModel,
  IITRequestCounterModel,
  LatestSessionModel,
  LocationModel,
  LocationStatsModel,
  NominationModel,
  NominatorModel,
  NominatorStakeModel,
  OfflineEventModel,
  PayoutTransactionModel,
  PriceModel,
  ReleaseModel,
  RewardModel,
  TelemetryNodeModel,
  ValidatorModel,
  ValidatorScoreMetadataModel,
  ValidatorSetModel,
} from "../../src/db/models";

export const deleteDelayedTxItems = async () => {
  await DelayedTxModel.deleteMany({});
};

export const deleteIdentities = async () => {
  await IdentityModel.deleteMany({});
};

export const deleteLatestSessions = async () => {
  await LatestSessionModel.deleteMany({});
};

export const deleteValidatorSets = async () => {
  await ValidatorSetModel.deleteMany({});
};

export const deleteLocations = async () => {
  await LocationModel.deleteMany({});
};

export const deleteNominatorStakes = async () => {
  await NominatorStakeModel.deleteMany({});
};

export const deleteTelemetryNodes = async () => {
  await TelemetryNodeModel.deleteMany({});
};

export const deleteCandidates = async () => {
  await CandidateModel.deleteMany({});
};

export const deleteEras = async () => {
  await EraModel.deleteMany({});
};

export const deleteNominators = async () => {
  await NominatorModel.deleteMany({});
};

export const deleteNominations = async () => {
  await NominationModel.deleteMany({});
};

export const deleteChainMetadata = async () => {
  await ChainMetadataModel.deleteMany({});
};

export const deleteEraPoints = async () => {
  await EraPointsModel.deleteMany({});
};

export const deleteEraStats = async () => {
  await EraStatsModel.deleteMany({});
};

export const deleteValidatorScoreMetadata = async () => {
  await ValidatorScoreMetadataModel.deleteMany({});
};

export const deleteReleases = async () => {
  await ReleaseModel.deleteMany({});
};

export const deleteLocationStats = async () => {
  await LocationStatsModel.deleteMany({});
};

export const deleteIITItems = async () => {
  await IITModel.deleteMany({});
};

export const deleteIITRequestCounterItems = async () => {
  await IITRequestCounterModel.deleteMany({});
};

export const deleteHeartbeatIndexItems = async () => {
  await HeartbeatIndexModel.deleteMany({});
};

export const deleteValidatorItems = async () => {
  await ValidatorModel.deleteMany({});
};

export const deleteBeefyStatsItems = async () => {
  await BeefyStatsModel.deleteMany({});
};

export const deletePayoutTransactionItems = async () => {
  await PayoutTransactionModel.deleteMany({});
};

export const deleteRewardItems = async () => {
  await RewardModel.deleteMany({});
};

export const deleteBlockIndexItems = async () => {
  await BlockIndexModel.deleteMany({});
};

export const deleteOfflineEventItems = async () => {
  await OfflineEventModel.deleteMany({});
};

export const deletePriceItems = async () => {
  await PriceModel.deleteMany({});
};

export const deleteAllDb = async () => {
  await deleteDelayedTxItems();
  await deleteIdentities();
  await deleteLatestSessions();
  await deleteValidatorSets();
  await deleteLocations();
  await deleteNominatorStakes();
  await deleteTelemetryNodes();
  await deleteCandidates();
  await deleteEras();
  await deleteNominators();
  await deleteNominations();
  await deleteChainMetadata();
  await deleteEraPoints();
  await deleteEraStats();
  await deleteValidatorScoreMetadata();
  await deleteReleases();
  await deleteLocationStats();
  await deleteIITItems();
  await deleteIITRequestCounterItems();
  await deleteHeartbeatIndexItems();
  await deleteValidatorItems();
  await deleteBeefyStatsItems();
  await deletePayoutTransactionItems();
  await deleteRewardItems();
  await deleteBlockIndexItems();
  await deleteOfflineEventItems();
  await deletePriceItems();
};
