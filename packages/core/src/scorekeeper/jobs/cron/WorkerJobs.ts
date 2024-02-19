import { ChainData, Constraints } from "@1kv/common";
import { otvWorker } from "@1kv/worker";

// Wrappers around the jobs importted from the `Worker` package

// Runs Monitor Job
export const monitorJob = async () => {
  await otvWorker.jobs.getLatestTaggedRelease();
  return true;
};

// Runs Validity Job
export const validityJob = async (constraints: Constraints.OTV) => {
  await otvWorker.jobs.validityJob(constraints);
  return true;
};

// Runs Score Candidate Job
export const scoreJob = async (constraints: Constraints.OTV) => {
  await otvWorker.jobs.scoreJob(constraints);
  return true;
};

// Updates the era stats
export const eraStatsJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.eraStatsJob(chaindata);
  return true;
};

// Updates Era Point data for all validators
export const eraPointsJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.eraPointsJob(chaindata);
  return true;
};

// Updates validator preferences for all validators
export const validatorPrefJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.validatorPrefJob(chaindata);
  return true;
};

// Updates session keys of all validators
export const sessionKeyJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.sessionKeyJob(chaindata);
  return true;
};

// Updates the inclusion rate of all validators
export const inclusionJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.inclusionJob(chaindata);
  return true;
};

export const activeValidatorJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.activeValidatorJob(chaindata);
  return true;
};

// Job for aggregating location stats of all nodes
export const locationStatsJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.locationStatsJob(chaindata);
  return true;
};

export const nominatorJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.nominatorJob(chaindata);
  return true;
};

export const blockJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.blockDataJob(chaindata);
  return true;
};

export const unclaimedEraJob = async (chaindata: ChainData) => {
  await otvWorker.jobs.unclaimedErasJob(chaindata);
  return true;
};
