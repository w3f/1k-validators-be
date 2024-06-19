import promClient from "prom-client";

import { ConfigSchema } from "./config";
import { jobStatusEmitter } from "./Events";
import { JobStatus } from "./scorekeeper/jobs/JobsClass";
import logger from "./logger";

export const metricsLabel = { label: "Metrics" };

export type Metrics = {
  counters: {
    nominations: promClient.Counter;
    blocksScanned: promClient.Counter;
    jobRuns: promClient.Counter;
  };
  gauges: {
    dbConnectivity: promClient.Gauge;
    telemetryConnectivity: promClient.Gauge;
    chainRpcConnectivity: promClient.Gauge;
    jobProgress: promClient.Gauge;
    latestBlock: promClient.Gauge;
  };
  histograms: {
    jobExecutionTime: promClient.Histogram;
  };
};

let metrics: Metrics | null = null;

export function setupMetrics(config: ConfigSchema): void {
  const prefix = config.global.prometheusPrefix ?? "otv_backend_";
  metrics = {
    counters: {
      blocksScanned: new promClient.Counter({
        name: `${prefix}blocks_scanned_total`,
        help: "amount of blocks scanned",
      }),
      jobRuns: new promClient.Counter({
        name: `${prefix}jobs_runs_total`,
        help: "job events by name and status",
        labelNames: ["name", "status"],
      }),
      nominations: new promClient.Counter({
        name: `${prefix}nominations_total`,
        help: "nominations count by account",
        labelNames: ["account"],
      }),
    },
    gauges: {
      dbConnectivity: new promClient.Gauge({
        name: `${prefix}db_connectivity`,
        help: "database connection status; 0 or 1",
      }),
      telemetryConnectivity: new promClient.Gauge({
        name: `${prefix}telemetry_connectivity`,
        help: "telemetry connection status; 0 or 1",
      }),
      chainRpcConnectivity: new promClient.Gauge({
        name: `${prefix}chain_rpc_connectivity`,
        help: "chain RPC connection status by chain (relay, people); 0 or 1",
        labelNames: ["chain"],
      }),
      jobProgress: new promClient.Gauge({
        name: `${prefix}job_progress`,
        help: "job progress by name, in percents from 0 to 100",
        labelNames: ["name"],
      }),
      latestBlock: new promClient.Gauge({
        name: `${prefix}latest_block`,
        help: "latest scanned block number",
      }),
    },
    histograms: {
      jobExecutionTime: new promClient.Histogram({
        name: `${prefix}job_execution_time_seconds`,
        help: "job timings; only successful jobs are counted",
        labelNames: ["name"],
        buckets: growingBuckets(0, 10, 30),
      }),
    },
  };

  promClient.collectDefaultMetrics({ prefix });
  followJobs(metrics);
}

function getMetrics(): Metrics {
  if (metrics === null) {
    throw new Error("getMetrics() was called before setupMetrics()");
  }

  return metrics;
}

export function registerBlockScan(blockNumber: number): void {
  const metrics = getMetrics();
  metrics.counters.blocksScanned.inc();
  metrics.gauges.latestBlock.set(blockNumber);
}

export function registerNomination(account: string): void {
  getMetrics().counters.nominations.inc({ account });
}

export function setDbConnectivity(isConnected: boolean): void {
  getMetrics().gauges.dbConnectivity.set(isConnected ? 1 : 0);
}

export function setTelemetryConnectivity(isConnected: boolean): void {
  getMetrics().gauges.telemetryConnectivity.set(isConnected ? 1 : 0);
}

export function setChainRpcConnectivity(
  chain: string,
  isConnected: boolean,
): void {
  getMetrics().gauges.chainRpcConnectivity.set({ chain }, isConnected ? 1 : 0);
}

function followJobs(metrics: Metrics): void {
  const updateJob = (data: JobStatus) => {
    metrics.counters.jobRuns.inc({ name: data.name, status: data.status });
  };
  jobStatusEmitter.on("jobStarted", updateJob);
  jobStatusEmitter.on("jobRunning", updateJob);
  jobStatusEmitter.on("jobErrored", updateJob);
  jobStatusEmitter.on("jobFinished", (data: JobStatus) => {
    updateJob(data);
    if (!data.executedAt) {
      logger.error(
        `${data.name}: jobFinished event was emitted, but jobStatus.executedAt is empty`,
        metricsLabel,
      );
      return;
    }
    const duration = Math.ceil((Date.now() - data.executedAt) / 1000);
    metrics.histograms.jobExecutionTime.observe({ name: data.name }, duration);
  });

  jobStatusEmitter.on("jobProgress", (data: JobStatus) => {
    metrics.gauges.jobProgress.set({ name: data.name }, data.progress);
  });
}

// prom-client has two types of bucket generation: linear, which would create
// too much buckets for our case, and exponential, which would either create too
// little of buckets, or buckets with floating points.
// This creates buckets like [10, 30, 60, 100, 150, 210, 280, 360, 450, ...]
function growingBuckets(
  start: number,
  factor: number,
  count: number,
): number[] {
  const buckets = [];

  let currentBucket = start;
  for (let i = 0; i < count; i++) {
    currentBucket += factor * i;
    buckets.push(currentBucket);
  }
  return buckets;
}

export async function renderMetrics(): Promise<string> {
  return promClient.register.metrics();
}
