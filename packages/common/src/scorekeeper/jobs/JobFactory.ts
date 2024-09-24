import { Job, JobConfig, JobRunnerMetadata, jobsLabel } from "./JobsClass";
import {
  ActiveValidatorJob,
  BlockDataJob,
  EraPointsJob,
  EraStatsJob,
  InclusionJob,
  LocationStatsJob,
  MonitorJob,
  NominatorJob,
  ScoreJob,
  SessionKeyJob,
  UnclaimedErasJob,
  ValidatorPrefJob,
  ValidityJob,
} from "./specificJobs";
import { ClearOfflineJob } from "./specificJobs/ClearOfflineJob";
import logger from "../../logger";
import { MainScorekeeperJob } from "./specificJobs/MainScorekeeperJob";
import { JobNames } from "./JobConfigs";
import { ExecutionJob } from "./specificJobs/ExecutionJob";
import { CancelJob } from "./specificJobs/CancelJob";
import { StaleNominationJob } from "./specificJobs/StaleNomination";

export class JobFactory {
  static makeJobs = async (
    jobConfigs: JobConfig[],
    jobRunnerMetadata: JobRunnerMetadata,
  ): Promise<Job[]> => {
    try {
      const jobs: Job[] = [];
      for (const jobConfig of jobConfigs) {
        switch (jobConfig.name) {
          case JobNames.ActiveValidator:
            jobs.push(new ActiveValidatorJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Monitor:
            jobs.push(new MonitorJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.ClearOffline:
            jobs.push(new ClearOfflineJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Score:
            jobs.push(new ScoreJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Validity:
            jobs.push(new ValidityJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.EraStats:
            jobs.push(new EraStatsJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.EraPoints:
            jobs.push(new EraPointsJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.LocationStats:
            jobs.push(new LocationStatsJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.UnclaimedEras:
            jobs.push(new UnclaimedErasJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Inclusion:
            jobs.push(new InclusionJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.SessionKey:
            jobs.push(new SessionKeyJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.ValidatorPref:
            jobs.push(new ValidatorPrefJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Nominator:
            jobs.push(new NominatorJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.BlockData:
            jobs.push(new BlockDataJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.MainScorekeeper:
            jobs.push(new MainScorekeeperJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Execution:
            jobs.push(new ExecutionJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.Cancel:
            jobs.push(new CancelJob(jobConfig, jobRunnerMetadata));
            break;
          case JobNames.StaleNomination:
            jobs.push(new StaleNominationJob(jobConfig, jobRunnerMetadata));
            break;
          default:
            logger.error(`Job not found: ${jobConfig.name}`, jobsLabel);
            break;
        }
      }
      return jobs;
    } catch (e) {
      logger.error(`Error making jobs: ${e}`, jobsLabel);
      return [];
    }
  };
}
