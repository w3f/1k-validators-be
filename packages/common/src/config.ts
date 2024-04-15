import * as fs from "fs";
import path from "path";
import { isValidUrl } from "./utils/util";
import logger from "./logger";

type CandidateConfig = {
  slotId: number;
  name: string;
  stash: string;
  riotHandle: string;
  kusamaStash?: string;
  skipSelfStake?: boolean;
  kyc: boolean;
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
    sanctionedGeoArea?: {
      skip: boolean;
      sanctionedCountries: string[];
      sanctionedRegions: string[];
    };
  };
  cron: {
    monitor: string;
    monitorEnabled: boolean;
    clearOffline: string;
    clearOfflineEnabled: boolean;
    validity: string;
    validityEnabled: boolean;
    execution: string;
    scorekeeper: string;
    scorekeeperEnabled: boolean;
    cancel: string;
    cancelEnabled: boolean;
    stale: string;
    staleEnabled: boolean;
    score: string;
    scoreEnabled: boolean;
    eraStats: string;
    eraStatsEnabled: boolean;
    locationStats: string;
    locationStatsEnabled: boolean;
    // chain querying crons
    eraPoints: string;
    eraPointsEnabled: boolean;
    activeValidator: string;
    activeValidatorEnabled: boolean;
    inclusion: string;
    inclusionEnabled: boolean;
    sessionKey: string;
    sessionKeyEnabled: boolean;
    unclaimedEras: string;
    unclaimedErasEnabled: boolean;
    validatorPref: string;
    validatorPrefEnabled: boolean;
    nominator: string;
    nominatorEnabled: boolean;
    block: string;
    blockEnabled: boolean;
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
    dryRun: boolean;
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
  logger: {
    level: string;
    excludedLabels: string[];
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
  try {
    const secretPath = path.join(configDir, "secret.json");
    const secretConf = loadConfig(secretPath);

    const mainPath = path.join(configDir, "main.json");
    const mainConf = loadConfig(mainPath);

    mainConf.matrix.accessToken = secretConf?.matrix?.accessToken;
    mainConf.scorekeeper.nominators = secretConf?.scorekeeper?.nominators;

    const candidatesUrl = mainConf.global.candidatesUrl;

    // If the candidates url specified in the config is a valid url, fetch the candidates from the url, otherwise read the candidates from the file
    if (isValidUrl(candidatesUrl)) {
      const response = await fetch(candidatesUrl);
      const candidatesJSON = await response.json();

      mainConf.scorekeeper.candidates = candidatesJSON.candidates;
    } else {
      const conf = fs.readFileSync(candidatesUrl, { encoding: "utf-8" });
      const candidates = JSON.parse(conf);
      mainConf.scorekeeper.candidates = candidates.candidates;
    }

    return mainConf;
  } catch (e) {
    logger.error(`Error loading config: ${JSON.stringify(e)}`);
  }
};
