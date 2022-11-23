import { logger, queries, ChainData } from "@1kv/common";

export const inclusionLabel = { label: "InclusionJob" };

export const inclusionJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const [activeEra] = await chaindata.getActiveEraIndex();

  const candidates = await queries.allCandidates();
  for (const candidate of candidates) {
    // Set inclusion Rate
    const erasActive = await queries.getHistoryDepthEraPoints(
      candidate.stash,
      activeEra
    );
    const filteredEras = erasActive.filter((era) => era.eraPoints > 0);
    const inclusion = Number(filteredEras.length / 84);
    await queries.setInclusion(candidate.stash, inclusion);

    // Set span inclusion Rate
    const spanErasActive = await queries.getSpanEraPoints(
      candidate.stash,
      activeEra
    );
    const filteredSpanEras = spanErasActive.filter(
      (era: any) => era.eraPoints > 0
    );
    const spanInclusion = Number(filteredSpanEras.length / 28);
    await queries.setSpanInclusion(candidate.stash, spanInclusion);
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, inclusionLabel);
};

export const processInclusionJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Inclusion Job....`, inclusionLabel);
  await inclusionJob(chaindata);
};
