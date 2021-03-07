import * as fs from "fs";
import path from "path";

type CandidateConfig = {
  name: string;
  stash: string;
  riotHandle: string;
  kusamaStash?: string;
  skipSelfStake?: boolean;
  bio?: string;
};

export type NominatorConfig = {
  seed: string;
  maxNominations: number | "auto";
  isProxy?: boolean;
  proxyFor?: string;
};

export type Config = {
  constraints: {
    skipConnectionTime: boolean;
    skipIdentity: boolean;
    skipStakedDestination: boolean;
    skipClientUpgrade: boolean;
  };
  cron: {
    monitor: string;
    clearOffline: string;
    validity: string;
  };
  db: {
    mongo: {
      uri: string;
    };
  };
  global: {
    dryRun: boolean;
    networkPrefix: 0 | 2 | 3;
    test: boolean;
    retroactive: boolean;
  };
  matrix: {
    accessToken: string;
    baseUrl: string;
    enabled: boolean;
    room: string;
    userId: string;
  };
  scorekeeper: {
    candidates: CandidateConfig[];
    forceRound: boolean;
    nominating: boolean;
    nominators: NominatorConfig[][];
  };
  server: {
    port: number;
  };
  telemetry: {
    chains: string[];
    host: string;
  };
};

export const loadConfig = (configPath: string): Config => {
  let conf = fs.readFileSync(configPath, { encoding: "utf-8" });
  if (conf.startsWith("'")) {
    conf = conf.slice(1).slice(0, -1);
  }
  return JSON.parse(conf);
};

export const loadConfigDir = (configDir: string): Config => {
  const secretPath = path.join(configDir, "secret.json");
  const secretConf = loadConfig(secretPath);

  const mainPath = path.join(configDir, "main.json");
  const mainConf = loadConfig(mainPath);

  mainConf.matrix.accessToken = secretConf.matrix.accessToken;
  mainConf.scorekeeper.nominators = secretConf.scorekeeper.nominators;

  return mainConf;
};
