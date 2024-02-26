import {
  AccountingModel,
  BeefyStatsModel,
  BlockIndexModel,
  BotClaimEventModel,
  CandidateModel,
  ChainMetadataModel,
  DelayedTxModel,
  DelegationModel,
  EraInfoModel,
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
  OpenGovDelegationModel,
  PayoutTransactionModel,
  PriceModel,
  RankEventModel,
  ReleaseModel,
  RewardModel,
  SessionModel,
  TelemetryNodeModel,
  TotalEraPointsModel,
  UpdatingDelegationsModel,
  ValidatorModel,
  ValidatorScoreMetadataModel,
  ValidatorSetModel,
} from "../../src/db/models";

export const deleteAccountingItems = async () => {
  await AccountingModel.deleteMany({});
};

export const deleteRankEvents = async () => {
  await RankEventModel.deleteMany({});
};

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

export const deleteUpdatingDelegations = async () => {
  await UpdatingDelegationsModel.deleteMany({});
};

export const deleteDelegations = async () => {
  await DelegationModel.deleteMany({});
};

export const deleteOpenGovDelegations = async () => {
  await OpenGovDelegationModel.deleteMany({});
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

export const deleteBotClaimEvents = async () => {
  await BotClaimEventModel.deleteMany({});
};

export const deleteEraPoints = async () => {
  await EraPointsModel.deleteMany({});
};

export const deleteTotalEraPoints = async () => {
  await TotalEraPointsModel.deleteMany({});
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

export const deleteEraInfoItems = async () => {
  await EraInfoModel.deleteMany({});
};

export const deleteSessionItems = async () => {
  await SessionModel.deleteMany({});
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
  await deleteAccountingItems();
  await deleteRankEvents();
  await deleteDelayedTxItems();
  await deleteIdentities();
  await deleteLatestSessions();
  await deleteValidatorSets();
  await deleteLocations();
  await deleteNominatorStakes();
  await deleteUpdatingDelegations();
  await deleteDelegations();
  await deleteOpenGovDelegations();
  await deleteTelemetryNodes();
  await deleteCandidates();
  await deleteEras();
  await deleteNominators();
  await deleteNominations();
  await deleteChainMetadata();
  await deleteBotClaimEvents();
  await deleteEraPoints();
  await deleteTotalEraPoints();
  await deleteEraStats();
  await deleteValidatorScoreMetadata();
  await deleteReleases();
  await deleteLocationStats();
  await deleteIITItems();
  await deleteIITRequestCounterItems();
  await deleteEraInfoItems();
  await deleteSessionItems();
  await deleteHeartbeatIndexItems();
  await deleteValidatorItems();
  await deleteBeefyStatsItems();
  await deletePayoutTransactionItems();
  await deleteRewardItems();
  await deleteBlockIndexItems();
  await deleteOfflineEventItems();
  await deletePriceItems();
};
