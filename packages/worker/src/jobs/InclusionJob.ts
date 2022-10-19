import { Queue } from "bullmq";
import { logger, Db, ChainData, ApiHandler } from "@1kv/common";

export const InclusionJob = async (db, chaindata: ChainData) => {
  const start = Date.now();

  const [activeEra, err] = await chaindata.getActiveEraIndex();

  const candidates = await db.allCandidates();
  for (const candidate of candidates) {
    // Set inclusion Rate
    const erasActive = await db.getHistoryDepthEraPoints(
      candidate.stash,
      activeEra
    );
    const filteredEras = erasActive.filter((era) => era.eraPoints > 0);
    const inclusion = Number(filteredEras.length / 84);
    await db.setInclusion(candidate.stash, inclusion);

    // Set span inclusion Rate
    const spanErasActive = await db.getSpanEraPoints(
      candidate.stash,
      activeEra
    );
    const filteredSpanEras = spanErasActive.filter(
      (era: any) => era.eraPoints > 0
    );
    const spanInclusion = Number(filteredSpanEras.length / 28);
    await db.setSpanInclusion(candidate.stash, spanInclusion);
  }

  const end = Date.now();

  logger.info(
    `{cron::InclusionJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};
