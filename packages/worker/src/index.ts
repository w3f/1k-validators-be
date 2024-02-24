import * as worker from "./worker";
import * as jobs from "../../common/src/scorekeeper/jobs/specificJobs";
import * as queues from "./queues";
import * as workers from "./workers";

export const otvWorker = { worker, jobs, queues, workers };
