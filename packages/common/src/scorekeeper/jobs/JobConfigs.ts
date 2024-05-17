import * as Constants from "../../constants";
import {
  activeValidatorJobWithTiming,
  blockJobWithTiming,
  eraPointsJobWithTiming,
  eraStatsJobWithTiming,
  getLatestTaggedRelease,
  inclusionJobWithTiming,
  locationStatsJobWithTiming,
  nominatorJobWithTiming,
  scoreJobWithTiming,
  sessionKeyJobWithTiming,
  unclaimedEraJobWithTiming,
  validatorPrefJobWithTiming,
  validityJobWithTiming,
} from "./specificJobs";
import { mainScorekeeperJob } from "./specificJobs/MainScorekeeperJob";
import { executionJob } from "./specificJobs/ExecutionJob";
import { cancelJob } from "./specificJobs/CancelJob";
import { staleNominationJob } from "./specificJobs/StaleNomination";
import { clearOfflineJob } from "./specificJobs/ClearOfflineJob";
import { JobConfig } from "./types";

export enum JobNames {
  ActiveValidator = "ActiveValidatorJob",
  Monitor = "MonitorJob",
  ClearOffline = "ClearOfflineJob",
  Validity = "ValidityJob",
  Score = "ScoreJob",
  EraStats = "EraStatsJob",
  EraPoints = "EraPointsJob",
  Inclusion = "InclusionJob",
  SessionKey = "SessionKeyJob",
  UnclaimedEras = "UnclaimedErasJob",
  ValidatorPref = "ValidatorPrefJob",
  LocationStats = "LocationStatsJob",
  Nominator = "NominatorJob",
  BlockData = "BlockDataJob",
  MainScorekeeper = "MainScorekeeperJob",
  Execution = "ExecutionJob",
  Cancel = "CancelJob",
  StaleNomination = "StaleNominationJob",
}

export const jobConfigs: JobConfig[] = [
  {
    jobKey: "activeValidator",
    defaultFrequency: Constants.ACTIVE_VALIDATOR_CRON,
    jobFunction: activeValidatorJobWithTiming,
    name: JobNames.ActiveValidator,
  },
  {
    jobKey: "monitor",
    defaultFrequency: Constants.MONITOR_CRON,
    jobFunction: getLatestTaggedRelease,
    name: JobNames.Monitor,
  },
  {
    jobKey: "clearOffline",
    defaultFrequency: Constants.CLEAR_OFFLINE_CRON,
    jobFunction: clearOfflineJob,
    name: JobNames.ClearOffline,
  },
  {
    jobKey: "validity",
    defaultFrequency: Constants.VALIDITY_CRON,
    jobFunction: validityJobWithTiming,
    name: JobNames.Validity,
  },
  {
    jobKey: "score",
    defaultFrequency: Constants.SCORE_CRON,
    jobFunction: scoreJobWithTiming,
    name: JobNames.Score,
  },
  {
    jobKey: "eraStats",
    defaultFrequency: Constants.ERA_STATS_CRON,
    jobFunction: eraStatsJobWithTiming,
    name: JobNames.EraStats,
  },
  {
    jobKey: "eraPoints",
    defaultFrequency: Constants.ERA_POINTS_CRON,
    jobFunction: eraPointsJobWithTiming,
    name: JobNames.EraPoints,
  },
  {
    jobKey: "inclusion",
    defaultFrequency: Constants.INCLUSION_CRON,
    jobFunction: inclusionJobWithTiming,
    name: JobNames.Inclusion,
  },
  {
    jobKey: "sessionKey",
    defaultFrequency: Constants.SESSION_KEY_CRON,
    jobFunction: sessionKeyJobWithTiming,
    name: JobNames.SessionKey,
  },
  {
    jobKey: "unclaimedEras",
    defaultFrequency: Constants.UNCLAIMED_ERAS_CRON,
    jobFunction: unclaimedEraJobWithTiming,
    name: JobNames.UnclaimedEras,
  },
  {
    jobKey: "validatorPref",
    defaultFrequency: Constants.VALIDATOR_PREF_CRON,
    jobFunction: validatorPrefJobWithTiming,
    name: JobNames.ValidatorPref,
  },
  {
    jobKey: "locationStats",
    defaultFrequency: Constants.LOCATION_STATS_CRON,
    jobFunction: locationStatsJobWithTiming,
    name: JobNames.LocationStats,
  },
  {
    jobKey: "nominator",
    defaultFrequency: Constants.NOMINATOR_CRON,
    jobFunction: nominatorJobWithTiming,
    name: JobNames.Nominator,
  },
  {
    jobKey: "block",
    defaultFrequency: Constants.BLOCK_CRON,
    jobFunction: blockJobWithTiming,
    name: JobNames.BlockData,
  },
  {
    jobKey: "scorekeeper",
    defaultFrequency: Constants.SCOREKEEPER_CRON,
    jobFunction: mainScorekeeperJob,
    name: JobNames.MainScorekeeper,
  },
  {
    jobKey: "execution",
    defaultFrequency: Constants.EXECUTION_CRON,
    jobFunction: executionJob,
    name: JobNames.Execution,
  },
  {
    jobKey: "cancel",
    defaultFrequency: Constants.CANCEL_CRON,
    jobFunction: cancelJob,
    name: JobNames.Cancel,
  },
  {
    jobKey: "stale",
    defaultFrequency: Constants.STALE_CRON,
    jobFunction: staleNominationJob,
    name: JobNames.StaleNomination,
  },
];
