import { Queue } from "bullmq";
import { logger } from "@1kv/common";
import {
  ACTIVE_VALIDATOR_JOB,
  COUNCIL_JOB,
  DELEGATION_JOB,
  DEMOCRACY_JOB,
  ERA_POINTS_JOB,
  ERA_STATS_JOB,
  INCLUSION_JOB,
  NOMINATOR_JOB,
  SESSION_KEY_JOB,
  VALIDATOR_PREF_JOB,
} from "../jobs";

export const createChainDataQueue = async (host, port) => {
  const queue = await new Queue("chaindata", {
    connection: {
      host: host,
      port: port,
    },
  });
  return queue;
};

export const addActiveValidatorJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Active Validator Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: ACTIVE_VALIDATOR_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addCouncilJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Council Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: COUNCIL_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addDelegationJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Delegation to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: DELEGATION_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addDemocracyJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Democracy to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: DEMOCRACY_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addEraPointsJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Era Points Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: ERA_POINTS_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addEraStatsJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Era Stats Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: ERA_STATS_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addInclusionJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Inclusion Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: INCLUSION_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addNominatorJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Nominator Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: NOMINATOR_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addSessionKeyJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Session Key Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: SESSION_KEY_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addValidatorPrefJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Validator Pref Job to Queue.....`);
  await queue.add(
    "chaindata",
    { jobType: VALIDATOR_PREF_JOB },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};
