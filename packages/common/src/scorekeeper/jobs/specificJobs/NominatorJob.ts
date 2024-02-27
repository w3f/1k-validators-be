import { jobStatusEmitter } from "../../../Events";
import { logger, queries } from "../../../index";
import { jobsMetadata } from "../JobsClass";
import { withExecutionTimeLogging } from "../../../utils";

export const nominatorLabel = { label: "NominatorJob" };

export const nominatorJob = async (
  metadata: jobsMetadata,
): Promise<boolean> => {
  try {
    const { chaindata } = metadata;
    const [activeEra] = await chaindata.getActiveEraIndex();
    const nominators = await chaindata.getNominators();
    const candidates = await queries.allCandidates();
    const totalCandidates = candidates.length;
    let processedCandidates = 0;

    for (const candidate of candidates) {
      const exposure = await chaindata.getExposure(activeEra, candidate.stash);
      if (!exposure) {
        return false;
      }
      const { total, others } = exposure;
      const allNominators = await Promise.all(
        nominators.filter((nom) => nom?.targets?.includes(candidate.stash)),
      );
      const inactiveNominators = allNominators.filter((nominator) => {
        let active = false;
        others.forEach((other) => {
          if (other.address === nominator.address) {
            active = true;
          }
        });
        return !active;
      });
      let totalInactiveStake = 0;
      inactiveNominators.forEach((nominator) => {
        totalInactiveStake += Number(nominator.bonded);
      });

      await queries.setNominatorStake(
        candidate.stash,
        activeEra,
        total,
        totalInactiveStake,
        others,
        inactiveNominators,
      );

      processedCandidates++;

      // Calculate progress percentage
      const progress = Math.floor(
        (processedCandidates / totalCandidates) * 100,
      );

      // Emit progress update event with candidate's name
      jobStatusEmitter.emit("jobProgress", {
        name: "Nominator Job",
        progress,
        updated: Date.now(),
        iteration: `Processed candidate ${candidate.name}`,
      });
    }

    return true;
  } catch (e) {
    logger.error(`Error running nominator job: ${e}`, nominatorLabel);
    return false;
  }
};
export const nominatorJobWithTiming = withExecutionTimeLogging(
  nominatorJob,
  nominatorLabel,
  "Nominator Job Done",
);

export const processNominatorJob = async (job: any, metadata: jobsMetadata) => {
  logger.info(`Processing Nominator Job....`, nominatorLabel);
  await nominatorJob(metadata);
};
