import { logger, queries } from "../../../index";
import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";
import { JobNames } from "../JobConfigs";

export const inclusionLabel = { label: "InclusionJob" };

export class InclusionJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const inclusionJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { chaindata } = metadata;
    const [activeEra] = await chaindata.getActiveEraIndex();

    const candidates = await queries.allCandidates();

    // Emit progress update indicating the start of the job
    jobStatusEmitter.emit("jobProgress", {
      name: JobNames.Inclusion,
      progress: 0,
      updated: Date.now(),
    });

    for (const candidate of candidates) {
      // Set inclusion Rate
      const erasActive = await queries.getHistoryDepthEraPoints(
        candidate.stash,
        activeEra,
      );
      const filteredEras = erasActive.filter((era) => era.eraPoints > 0);
      const inclusion = Number(filteredEras.length / 84);
      await queries.setInclusion(candidate, inclusion);

      // Set span inclusion Rate
      const spanErasActive = await queries.getSpanEraPoints(
        candidate.stash,
        activeEra,
      );
      const filteredSpanEras = spanErasActive.filter(
        (era: any) => era.eraPoints > 0,
      );
      const spanInclusion = Number(filteredSpanEras.length / 28);
      await queries.setSpanInclusion(candidate, spanInclusion);

      const lastActiveEraPoints = await queries.getValidatorLastEraPoints(
        candidate.stash,
      );
      const lastActiveEra = lastActiveEraPoints?.era || 0;
      await queries.setNominatedAtEra(candidate, lastActiveEra);

      // Emit progress update for each candidate processed, including the candidate's name
      const progressPercentage =
        ((candidates.indexOf(candidate) + 1) / candidates.length) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.Inclusion,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed candidate ${candidate.name}`,
      });
    }

    // Emit progress update indicating the completion of the job
    jobStatusEmitter.emit("jobProgress", {
      name: "Inclusion Job",
      progress: 100,
      updated: Date.now(),
    });

    return true;
  } catch (e) {
    logger.error(`Error running inclusion job: ${e}`, inclusionLabel);
    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.Inclusion,
      updated: Date.now(),
      error: JSON.stringify(e),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
    return false;
  }
};

export const processInclusionJob = async (
  job: any,
  metadata: JobRunnerMetadata,
) => {
  logger.info(`Processing Inclusion Job....`, inclusionLabel);
  await inclusionJob(metadata);
};

export const inclusionJobWithTiming = withExecutionTimeLogging(
  inclusionJob,
  inclusionLabel,
  "Inclusion Job Done",
);
