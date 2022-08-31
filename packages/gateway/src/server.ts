import Koa from "koa";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";
import Router from "@koa/router";

// import { Config } from "./config";
import { Db, Config, logger } from "@1kv/common";
// import { Db, Config, logger } from "../../common/build/index";
// import Db from "@1kv/common";
// import logger from "./logger";
// import ScoreKeeper from "./scorekeeper";
import LRU from "lru-cache";
import koaCash from "koa-cash";

const API = {
  Accounting: "/accounting/:stashOrController",
  Candidate: "/candidate/:stashOrName",
  GetCandidates: "/candidates",
  GetNodes: "/nodes",
  GetNominators: "/nominators",
  GetNominator: "/nominator/:stash",
  GetNominations: "/nominations",
  GetNominatorNominations: "/nominations/:address/:last",
  GetBotClaimEvents: "/claims",
  Health: "/healthcheck",
  EraPoints: "/erapoints/:stash",
  TotalEraPoints: "/totalerapoints",
  LastNomination: "/lastnomination",
  ProxyTxs: "/proxytxs",
  EraStats: "/erastats",
  Score: "/score/:stash",
  ScoreMetadata: "/scoremetadata",
  Release: "/release",
  LocationStats: "/locationstats",
  SessionLocationStats: "/locationstats/:session",
  Councillors: "/councillor",
  Councillor: "/councillor/:address",
  Voters: "/voters",
  ElectionStats: "/electionstats",
  EraPaid: "/erapaid",
  EraRewards: "/erareward/:stash/:limit",
  EraReward: "/erareward/:stash/:era",
  Referenda: "/referenda",
  Referendum: "/referendum/:index",
  LastReferendum: "/lastreferendum",
  LastReferendums: "/lastreferendums",
  ReferendumIndexVotes: "/referendumvotes/index/:index",
  ReferendumAccountVotes: "/referendumvotes/account/:address",
  NominatorStake: "/nominatorstake/:address",
  Delegations: "/delegations/:address",
  AllDelegations: "/delegations",
};

export default class Server {
  public app: Koa;
  private db: Db;
  private port: number;

  constructor(db: Db, config: Config.ConfigSchema) {
    this.app = new Koa();
    this.db = db;
    this.port = config.server.port;

    this.app.use(cors());
    this.app.use(bodyparser());

    const cache = new LRU({
      maxAge: 30000, // global max age
    });
    this.app.use(
      koaCash({
        get: (key) => {
          return cache.get(key);
        },
        set(key, value) {
          return cache.set(key, value);
        },
      })
    );

    const router = new Router();

    router.get(API.Accounting, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stashOrController } = ctx.params;
      const accounting = await this.db.getAccounting(stashOrController);
      ctx.body = accounting;
    });

    router.get(API.Candidate, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stashOrName } = ctx.params;
      if (stashOrName) {
        const candidate = await this.db.getCandidate(stashOrName);
        if (candidate && candidate.stash) {
          const score = await this.db.getValidatorScore(candidate.stash);
          ctx.body = {
            discoveredAt: candidate.discoveredAt,
            nominatedAt: candidate.nominatedAt,
            offlineSince: candidate.offlineSince,
            offlineAccumulated: candidate.offlineAccumulated,
            rank: candidate.rank,
            faults: candidate.faults,
            invalidityReasons: candidate.invalidityReasons,
            unclaimedEras: candidate.unclaimedEras,
            inclusion: candidate.inclusion,
            name: candidate.name,
            stash: candidate.stash,
            kusamaStash: candidate.kusamaStash,
            commission: candidate.commission,
            identity: candidate.identity,
            active: candidate.active,
            valid: candidate.valid,
            validity: candidate.invalidity,
            score: score,
            total: score && score.total ? score.total : 0,
            location: candidate.location,
            councilStake: candidate.councilStake,
            councilVotes: candidate.councilVotes,
            democracyVoteCount: candidate.democracyVoteCount,
            democracyVotes: candidate.democracyVotes,
          };
        } else {
          ctx.body = `${stashOrName} not found!`;
        }
      } else {
        ctx.body = `${stashOrName} not found!`;
      }
    });

    router.get(API.GetCandidates, async (ctx) => {
      if (await ctx.cashed()) return;
      let allCandidates = await this.db.allCandidates();
      allCandidates = await Promise.all(
        allCandidates.map(async (candidate) => {
          const score = await this.db.getValidatorScore(candidate.stash);
          return {
            discoveredAt: candidate.discoveredAt,
            nominatedAt: candidate.nominatedAt,
            offlineSince: candidate.offlineSince,
            offlineAccumulated: candidate.offlineAccumulated,
            rank: candidate.rank,
            faults: candidate.faults,
            invalidityReasons: candidate.invalidityReasons,
            unclaimedEras: candidate.unclaimedEras,
            inclusion: candidate.inclusion,
            name: candidate.name,
            stash: candidate.stash,
            kusamaStash: candidate.kusamaStash,
            commission: candidate.commission,
            identity: candidate.identity,
            active: candidate.active,
            valid: candidate.valid,
            validity: candidate.invalidity,
            score: score,
            total: score && score.total ? score.total : 0,
            location: candidate.location,
            councilStake: candidate.councilStake,
            councilVotes: candidate.councilVotes,
            democracyVoteCount: candidate.democracyVoteCount,
            democracyVotes: candidate.democracyVotes,
          };
        })
      );
      allCandidates = allCandidates.sort((a, b) => {
        return b.total - a.total;
      });
      ctx.body = allCandidates;
    });

    router.get(API.GetNodes, async (ctx) => {
      if (await ctx.cashed()) return;
      const allNodes: Array<any> = await this.db.allNodes();
      ctx.body = allNodes;
    });

    router.get(API.GetNominators, async (ctx) => {
      if (await ctx.cashed()) return;
      let allNominators = await this.db.allNominators();
      allNominators = allNominators.sort((a, b) => a.avgStake - b.avgStake);
      ctx.body = allNominators;
    });

    router.get(API.Release, async (ctx) => {
      if (await ctx.cashed()) return;
      const release = await this.db.getLatestRelease();
      ctx.body = release;
    });

    router.get(API.GetNominator, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stash } = ctx.params;
      const nominator = await this.db.getNominator(stash);
      ctx.body = nominator;
    });

    router.get(API.GetNominations, async (ctx) => {
      if (await ctx.cashed()) return;
      const allNominations = await this.db.allNominations();
      ctx.body = allNominations;
    });

    router.get(API.GetNominatorNominations, async (ctx) => {
      if (await ctx.cashed()) return;
      const { address, last } = ctx.params;
      last ? Number(last) : 30;
      const nominations = await this.db.getLastNominations(address, last);
      ctx.body = nominations;
    });

    router.get(API.GetBotClaimEvents, async (ctx) => {
      if (await ctx.cashed()) return;
      const allNominations = await this.db.getBotClaimEvents();
      ctx.body = allNominations;
    });

    router.get(API.Health, (ctx) => {
      const network = config.global.networkPrefix == 2 ? "Kusama" : "Polkadot";
      ctx.body = `${network} Thousand Validators v2.2.5`;
      ctx.status = 200;
    });

    router.get(API.EraPoints, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stash } = ctx.params;
      const latestEra = (await this.db.getLastTotalEraPoints())[0].era;
      const eraPoints = await this.db.getHistoryDepthEraPoints(
        stash,
        latestEra
      );
      ctx.body = eraPoints;
    });

    router.get(API.TotalEraPoints, async (ctx) => {
      if (await ctx.cashed()) return;
      const latestEra = (await this.db.getLastTotalEraPoints())[0].era;
      let eras = await this.db.getHistoryDepthTotalEraPoints(latestEra);
      eras = eras.map((era) => {
        return {
          era: era.era,
          totalEraPoints: era.totalEraPoints,
          min: era.min,
          max: era.max,
          average: era.average,
          median: era.median,
        };
      });
      ctx.body = eras;
    });

    router.get(API.LastNomination, async (ctx) => {
      if (await ctx.cashed()) return;
      const lastNomination = await this.db.getLastNominatedEraIndex();
      ctx.body = lastNomination;
    });

    router.get(API.ProxyTxs, async (ctx) => {
      if (await ctx.cashed()) return;
      const proxyTxs = await this.db.getAllDelayedTxs();
      ctx.body = proxyTxs;
    });

    router.get(API.EraStats, async (ctx) => {
      if (await ctx.cashed()) return;
      const latestEraStats = await this.db.getLatestEraStats();
      ctx.body = latestEraStats;
    });

    router.get(API.Score, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stash } = ctx.params;
      const score = await this.db.getValidatorScore(stash);
      ctx.body = score;
    });

    router.get(API.ScoreMetadata, async (ctx) => {
      if (await ctx.cashed()) return;
      const score = await this.db.getValidatorScoreMetadata();
      ctx.body = score;
    });

    router.get(API.LocationStats, async (ctx) => {
      if (await ctx.cashed()) return;
      const locationStats = await this.db.getLatestLocationStats();
      const sortedLocations = locationStats.locations.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedRegions = locationStats.regions.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedCountries = locationStats.countries.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedASNs = locationStats.asns.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedProviders = locationStats.providers.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      ctx.body = {
        session: locationStats.session,
        updated: locationStats.updated,
        locations: sortedLocations,
        regions: sortedRegions,
        countries: sortedCountries,
        asns: sortedASNs,
        providers: sortedProviders,
        locationVariance: locationStats.locationVariance,
        regionVariance: locationStats.regionVariance,
        countyVariance: locationStats.countryVariance,
        asnVariance: locationStats.asnVariance,
        providerVaraince: locationStats.providerVariance,
        decentralization: locationStats.decentralization,
      };
    });
    router.get(API.SessionLocationStats, async (ctx) => {
      if (await ctx.cashed()) return;
      const { session } = ctx.params;
      const locationStats = await this.db.getSessionLocationStats(session);
      const sortedLocations = locationStats.locations.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedRegions = locationStats.regions.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedCountries = locationStats.countries.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedASNs = locationStats.asns.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      const sortedProviders = locationStats.providers.sort((a, b) => {
        return b.numberOfNodes - a.numberOfNodes;
      });
      ctx.body = {
        session: locationStats.session,
        updated: locationStats.updated,
        locations: sortedLocations,
        regions: sortedRegions,
        countries: sortedCountries,
        asns: sortedASNs,
        providers: sortedProviders,
        locationVariance: locationStats.locationVariance,
        regionVariance: locationStats.regionVariance,
        countyVariance: locationStats.countryVariance,
        asnVariance: locationStats.asnVariance,
        providerVariance: locationStats.providerVariance,
        decentralization: locationStats.decentralization,
      };
    });
    router.get(API.ElectionStats, async (ctx) => {
      if (await ctx.cashed()) return;
      const electionStats = await this.db.getLatestElectionStats();
      ctx.body = electionStats;
    });
    router.get(API.Councillors, async (ctx) => {
      if (await ctx.cashed()) return;
      const councillors = await this.db.getAllCouncillors();
      ctx.body = councillors;
    });
    router.get(API.Councillor, async (ctx) => {
      if (await ctx.cashed()) return;
      const { address } = ctx.params;
      const councillor = await this.db.getCouncillor(address);
      ctx.body = councillor;
    });
    // Returns all candidates who back council members
    router.get(API.Voters, async (ctx) => {
      if (await ctx.cashed()) return;
      let allCandidates = await this.db.allCandidates();
      allCandidates = await Promise.all(
        allCandidates.map(async (candidate) => {
          const score = await this.db.getValidatorScore(candidate.stash);
          if (candidate.councilStake && candidate.councilStake > 0)
            return {
              discoveredAt: candidate.discoveredAt,
              nominatedAt: candidate.nominatedAt,
              offlineSince: candidate.offlineSince,
              offlineAccumulated: candidate.offlineAccumulated,
              rank: candidate.rank,
              faults: candidate.faults,
              invalidityReasons: candidate.invalidityReasons,
              unclaimedEras: candidate.unclaimedEras,
              inclusion: candidate.inclusion,
              name: candidate.name,
              stash: candidate.stash,
              kusamaStash: candidate.kusamaStash,
              commission: candidate.commission,
              identity: candidate.identity,
              active: candidate.active,
              valid: candidate.valid,
              validity: candidate.invalidity,
              score: score,
              total: score && score.total ? score.total : 0,
              location: candidate.location,
              councilStake: candidate.councilStake,
              councilVotes: candidate.councilVotes,
              democracyVoteCount: candidate.democracyVoteCount,
              democracyVotes: candidate.democracyVotes,
            };
        })
      );
      allCandidates = allCandidates.sort((a, b) => {
        return b.total - a.total;
      });
      ctx.body = allCandidates;
    });
    router.get(API.EraPaid, async (ctx) => {
      if (await ctx.cashed()) return;
      const lastEraPaid = await this.db.getLatestEraPaidEvent();
      ctx.body = lastEraPaid;
    });
    router.get(API.EraRewards, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stash, limit } = ctx.params;
      const lastRewards = await this.db.getLastEraRewards(stash, limit);
      ctx.body = lastRewards;
    });
    router.get(API.EraReward, async (ctx) => {
      if (await ctx.cashed()) return;
      const { stash, era } = ctx.params;
      const reward = await this.db.getEraReward(stash, era);
      ctx.body = reward;
    });
    router.get(API.Referenda, async (ctx) => {
      if (await ctx.cashed()) return;
      const referenda = await this.db.getAllReferenda();
      ctx.body = referenda;
    });
    router.get(API.Referendum, async (ctx) => {
      if (await ctx.cashed()) return;
      const { index } = ctx.params;
      const referendum = await this.db.getReferendum(index);
      ctx.body = referendum;
    });
    router.get(API.LastReferendum, async (ctx) => {
      if (await ctx.cashed()) return;
      const referendum = (await db.getLastReferenda())[0];
      ctx.body = referendum;
    });
    router.get(API.LastReferendums, async (ctx) => {
      if (await ctx.cashed()) return;
      const referendum = await this.db.getLastReferenda();
      ctx.body = referendum;
    });
    router.get(API.ReferendumIndexVotes, async (ctx) => {
      if (await ctx.cashed()) return;
      const { index } = ctx.params;
      const referendum = await this.db.getVoteReferendumIndex(index);
      ctx.body = referendum;
    });
    router.get(API.ReferendumAccountVotes, async (ctx) => {
      if (await ctx.cashed()) return;
      const { address } = ctx.params;
      const referendum = await this.db.getAccountVoteReferendum(address);
      ctx.body = referendum;
    });

    router.get(API.NominatorStake, async (ctx) => {
      if (await ctx.cashed()) return;
      const { address } = ctx.params;
      const stake = await this.db.getLatestNominatorStake(address);
      ctx.body = stake;
    });

    router.get(API.Delegations, async (ctx) => {
      // if (await ctx.cashed()) return;
      const { address } = ctx.params;
      const delegations = await this.db.getDelegations(address);
      ctx.body = delegations;
    });

    router.get(API.AllDelegations, async (ctx) => {
      // if (await ctx.cashed()) return;
      const delegations = await this.db.getAllDelegations();
      ctx.body = delegations;
    });

    this.app.use(router.routes());
  }

  start(): void {
    logger.info(`Now listening on ${this.port}`);
    this.app.listen(this.port);
  }
}
