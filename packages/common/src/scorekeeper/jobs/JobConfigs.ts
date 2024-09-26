import { JobConfig, JobRunnerMetadata, jobsLabel } from "./JobsClass";
import { Constants } from "../../index";
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
import logger from "../../logger";
import { executionJob } from "./specificJobs/ExecutionJob";
import { cancelJob } from "./specificJobs/CancelJob";
import { staleNominationJob } from "./specificJobs/StaleNomination";
import { clearOfflineJob } from "./specificJobs/ClearOfflineJob";

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

export const getJobConfigs = (
  jobRunnerMetadata: JobRunnerMetadata,
): JobConfig[] => {
  try {
    logger.info(`getting job configs for each job`, jobsLabel);

    const activeValdiatorJobConfig: JobConfig = {
      jobKey: "activeValidator",
      defaultFrequency: Constants.ACTIVE_VALIDATOR_CRON,
      jobFunction: async () => {
        await activeValidatorJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.ActiveValidator,
      preventOverlap: true,
    };

    const monitorJobConfig: JobConfig = {
      jobKey: "monitor",
      defaultFrequency: Constants.MONITOR_CRON,
      jobFunction: async () => {
        await getLatestTaggedRelease(
          jobRunnerMetadata.config.constraints.clientUpgrade.releaseTagFormat,
        );
      },
      name: JobNames.Monitor,
      preventOverlap: true,
    };

    const clearOfflineJobConfig: JobConfig = {
      jobKey: "clearOffline",
      defaultFrequency: Constants.CLEAR_OFFLINE_CRON,
      jobFunction: async () => {
        await clearOfflineJob();
      },
      name: JobNames.ClearOffline,
      preventOverlap: true,
    };

    const validityJobConfig: JobConfig = {
      jobKey: "validity",
      defaultFrequency: Constants.VALIDITY_CRON,
      jobFunction: async () => {
        await validityJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.Validity,
      preventOverlap: true,
    };

    const scoreJobConfig: JobConfig = {
      jobKey: "score",
      defaultFrequency: Constants.SCORE_CRON,
      jobFunction: async () => {
        await scoreJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.Score,
      preventOverlap: true,
    };

    const eraStatsJobConfig: JobConfig = {
      jobKey: "eraStats",
      defaultFrequency: Constants.ERA_STATS_CRON,
      jobFunction: async () => {
        await eraStatsJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.EraStats,
      preventOverlap: true,
    };

    const eraPointsJobConfig: JobConfig = {
      jobKey: "eraPoints",
      defaultFrequency: Constants.ERA_POINTS_CRON,
      jobFunction: async () => {
        await eraPointsJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.EraPoints,
      preventOverlap: true,
    };

    const inclusionJobConfig: JobConfig = {
      jobKey: "inclusion",
      defaultFrequency: Constants.INCLUSION_CRON,
      jobFunction: async () => {
        await inclusionJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.Inclusion,
      preventOverlap: true,
    };

    const sessionKeyJobConfig: JobConfig = {
      jobKey: "sessionKey",
      defaultFrequency: Constants.SESSION_KEY_CRON,
      jobFunction: async () => {
        await sessionKeyJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.SessionKey,
      preventOverlap: true,
    };

    const unclaimedEraJobConfig: JobConfig = {
      jobKey: "unclaimedEras",
      defaultFrequency: Constants.UNCLAIMED_ERAS_CRON,
      jobFunction: async () => {
        await unclaimedEraJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.UnclaimedEras,
      preventOverlap: true,
    };

    const validatorPrefJobConfig: JobConfig = {
      jobKey: "validatorPref",
      defaultFrequency: Constants.VALIDATOR_PREF_CRON,
      jobFunction: async () => {
        await validatorPrefJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.ValidatorPref,
      preventOverlap: true,
    };

    const locationStatsJobConfig: JobConfig = {
      jobKey: "locationStats",
      defaultFrequency: Constants.LOCATION_STATS_CRON,
      jobFunction: async () => {
        await locationStatsJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.LocationStats,
      preventOverlap: true,
    };

    const nominatorJobConfig: JobConfig = {
      jobKey: "nominator",
      defaultFrequency: Constants.NOMINATOR_CRON,
      jobFunction: async () => {
        await nominatorJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.Nominator,
      preventOverlap: true,
    };

    const blockDataJobConfig: JobConfig = {
      jobKey: "block",
      defaultFrequency: Constants.BLOCK_CRON,
      jobFunction: async () => {
        await blockJobWithTiming(jobRunnerMetadata);
      },
      name: JobNames.BlockData,
      preventOverlap: true,
    };

    const mainScorekeeperJobConfig: JobConfig = {
      jobKey: "scorekeeper",
      defaultFrequency: Constants.SCOREKEEPER_CRON,
      jobFunction: async () => {
        await mainScorekeeperJob(jobRunnerMetadata);
      },
      name: JobNames.MainScorekeeper,
      preventOverlap: true,
    };

    const executionJobConfig: JobConfig = {
      jobKey: "execution",
      defaultFrequency: Constants.EXECUTION_CRON,
      jobFunction: async () => {
        await executionJob(jobRunnerMetadata);
      },
      name: JobNames.Execution,
      preventOverlap: true,
    };

    const cancelJobConfig: JobConfig = {
      jobKey: "cancel",
      defaultFrequency: Constants.CANCEL_CRON,
      jobFunction: async () => {
        await cancelJob(jobRunnerMetadata);
      },
      name: JobNames.Cancel,
      preventOverlap: true,
    };

    const staleNominationJobConfig: JobConfig = {
      jobKey: "stale",
      defaultFrequency: Constants.STALE_CRON,
      jobFunction: async () => {
        await staleNominationJob(jobRunnerMetadata);
      },
      name: JobNames.StaleNomination,
      preventOverlap: true,
    };

    return [
      activeValdiatorJobConfig,
      monitorJobConfig,
      clearOfflineJobConfig,
      validityJobConfig,
      scoreJobConfig,
      eraStatsJobConfig,
      eraPointsJobConfig,
      inclusionJobConfig,
      sessionKeyJobConfig,
      unclaimedEraJobConfig,
      validatorPrefJobConfig,
      locationStatsJobConfig,
      nominatorJobConfig,
      blockDataJobConfig,
      mainScorekeeperJobConfig,
      executionJobConfig,
      cancelJobConfig,
      staleNominationJobConfig,
    ];
  } catch (e) {
    logger.error(e, {
      message: "Error getting job configs",
      ...jobsLabel,
    });
    return [];
  }
};
