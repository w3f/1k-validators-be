import * as worker from "./worker";
import * as jobs from "./jobs";
import * as queues from "./queues";
import * as workers from "./workers";
import "@polkadot/api-augment";
export const otvWorker = { worker, jobs, queues, workers };
