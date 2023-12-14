import * as fs from "fs";
import path from "path";
import { ClaimerConfig } from "./types";

type CandidateConfig = {
  name: string;
  stash: string;
  riotHandle: string;
  kusamaStash?: string;
  skipSelfStake?: boolean;
};

export type NominatorConfig = {
  seed: string;
  isProxy?: boolean;
  proxyFor?: string;
  proxyDelay?: number;
};

export type ConfigSchema = {
  constraints: {
    skipConnectionTime: boolean;
    skipIdentity: boolean;
    skipClientUpgrade: boolean;
    skipUnclaimed: boolean;
    skipClaiming: boolean;
    forceClientVersion: string;
    minSelfStake: number;
    commission: number;
    unclaimedEraThreshold: number;
  };
  cron: {
    monitor: string;
    clearOffline: string;
    validity: string;
    execution: string;
    scorekeeper: string;
    rewardClaiming: string;
    cancel: string;
    stale: string;
    score: string;
    eraStats: string;
    locationStats: string;
    democracy: string;
    // chain querying crons
    eraPoints: string;
    activeValidator: string;
    inclusion: string;
    sessionKey: string;
    unclaimedEras: string;
    validatorPref: string;
    nominator: string;
    delegation: string;
    block: string;
  };
  db: {
    mongo: {
      uri: string;
    };
  };
  global: {
    dryRun: boolean;
    networkPrefix: 0 | 2 | 3;
    apiEndpoints: string[];
    bootstrap: boolean;
    kusamaBootstrapEndpoint: string;
    polkadotBootstrapEndpoint: string;
    candidatesUrl: string;
  };
  matrix: {
    accessToken: string;
    baseUrl: string;
    enabled: boolean;
    room: string;
    userId: string;
  };
  redis: {
    enable: boolean;
    host: string;
    port: number;
  };
  proxy: {
    timeDelayBlocks: number;
    blacklistedAnnouncements: string[];
  };
  score: {
    inclusion: number | 0;
    spanInclusion: number | 0;
    discovered: number | 0;
    nominated: number | 0;
    rank: number | 0;
    bonded: number | 0;
    faults: number | 0;
    offline: number | 0;
    unclaimed: number | 0;
    location: number | 0;
    region: number | 0;
    country: number | 0;
    provider: number | 0;
    nominations: number | 0;
    delegations: number | 0;
    openGov: number | 0;
    openGovDelegation: number | 0;
    rpc: number | 0;
    client: number | 0;
    useInclusion: boolean;
    useSpanInclusion: boolean;
    useDiscovered: boolean;
    useNominated: boolean;
    useRank: boolean;
    useBonded: boolean;
    useFaults: boolean;
    useOffline: boolean;
    useUnclaimed: boolean;
    useLocation: boolean;
    useRegion: boolean;
    useCountry: boolean;
    useProvider: boolean;
    useNominations: boolean;
    useDelegations: boolean;
    useOpenGov: boolean;
    useOpenGovDelegation: boolean;
    useRpc: boolean;
    useClient: boolean;
  };
  scorekeeper: {
    candidates: CandidateConfig[];
    forceRound: boolean;
    nominating: boolean;
    nominators: NominatorConfig[][];
    claimer: ClaimerConfig;
  };
  server: {
    enable: boolean;
    onlyHealth: boolean;
    serveDocs: boolean;
    serveSwagger: boolean;
    port: number;
    cache: number;
  };
  telemetry: {
    enable: boolean;
    chains: string[];
    blacklistedProviders: string[];
    host: string;
    ipinfoToken: string;
  };
};

export const loadConfig = (configPath: string): ConfigSchema => {
  let conf = fs.readFileSync(configPath, { encoding: "utf-8" });
  if (conf.startsWith("'")) {
    conf = conf.slice(1).slice(0, -1);
  }
  return JSON.parse(conf);
};

export const loadConfigDir = async (configDir: string) => {
  const secretPath = path.join(configDir, "secret.json");
  const secretConf = loadConfig(secretPath);

  const mainPath = path.join(configDir, "main.json");
  const mainConf = loadConfig(mainPath);

  // if (
  //   mainConf.matrix &&
  //   mainConf.matrix.accessToken &&
  //   secretConf?.matrix?.accessToken
  // ) {
  mainConf.matrix.accessToken = secretConf?.matrix?.accessToken;
  // }
  // if (secretConf?.scorekeeper?.nominators) {
  mainConf.scorekeeper.nominators = secretConf?.scorekeeper?.nominators;
  // }
  // if (mainConf.scorekeeper && mainConf.scorekeeper.claimer) {
  mainConf.scorekeeper.claimer = secretConf?.scorekeeper?.claimer;
  // }

  const candidatesUrl = mainConf.global.candidatesUrl;
  const response = await fetch(candidatesUrl);
  const candidatesJSON = await response.json();

  mainConf.scorekeeper.candidates = candidatesJSON.candidates;

  return mainConf;
};
