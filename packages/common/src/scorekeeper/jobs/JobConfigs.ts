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
import { JobConfig, JobKey } from "./types";

export const jobConfigs: JobConfig[] = [
  {
    jobKey: JobKey.ActiveValidator,
    defaultFrequency: Constants.ACTIVE_VALIDATOR_CRON,
    jobFunction: activeValidatorJobWithTiming,
  },
  {
    jobKey: JobKey.Monitor,
    defaultFrequency: Constants.MONITOR_CRON,
    jobFunction: getLatestTaggedRelease,
  },
  {
    jobKey: JobKey.ClearOffline,
    defaultFrequency: Constants.CLEAR_OFFLINE_CRON,
    jobFunction: clearOfflineJob,
  },
  {
    jobKey: JobKey.Validity,
    defaultFrequency: Constants.VALIDITY_CRON,
    jobFunction: validityJobWithTiming,
  },
  {
    jobKey: JobKey.Score,
    defaultFrequency: Constants.SCORE_CRON,
    jobFunction: scoreJobWithTiming,
  },
  {
    jobKey: JobKey.EraStats,
    defaultFrequency: Constants.ERA_STATS_CRON,
    jobFunction: eraStatsJobWithTiming,
  },
  {
    jobKey: JobKey.EraPoints,
    defaultFrequency: Constants.ERA_POINTS_CRON,
    jobFunction: eraPointsJobWithTiming,
  },
  {
    jobKey: JobKey.EraPoints,
    defaultFrequency: Constants.INCLUSION_CRON,
    jobFunction: inclusionJobWithTiming,
  },
  {
    jobKey: JobKey.SessionKey,
    defaultFrequency: Constants.SESSION_KEY_CRON,
    jobFunction: sessionKeyJobWithTiming,
  },
  {
    jobKey: JobKey.UnclaimedEras,
    defaultFrequency: Constants.UNCLAIMED_ERAS_CRON,
    jobFunction: unclaimedEraJobWithTiming,
  },
  {
    jobKey: JobKey.ValidatorPref,
    defaultFrequency: Constants.VALIDATOR_PREF_CRON,
    jobFunction: validatorPrefJobWithTiming,
  },
  {
    jobKey: JobKey.LocationStats,
    defaultFrequency: Constants.LOCATION_STATS_CRON,
    jobFunction: locationStatsJobWithTiming,
  },
  {
    jobKey: JobKey.Nominator,
    defaultFrequency: Constants.NOMINATOR_CRON,
    jobFunction: nominatorJobWithTiming,
  },
  {
    jobKey: JobKey.BlockData,
    defaultFrequency: Constants.BLOCK_CRON,
    jobFunction: blockJobWithTiming,
  },
  {
    jobKey: JobKey.MainScorekeeper,
    defaultFrequency: Constants.SCOREKEEPER_CRON,
    jobFunction: mainScorekeeperJob,
  },
  {
    jobKey: JobKey.Execution,
    defaultFrequency: Constants.EXECUTION_CRON,
    jobFunction: executionJob,
  },
  {
    jobKey: JobKey.Cancel,
    defaultFrequency: Constants.CANCEL_CRON,
    jobFunction: cancelJob,
  },
  {
    jobKey: JobKey.StaleNomination,
    defaultFrequency: Constants.STALE_CRON,
    jobFunction: staleNominationJob,
  },
];
