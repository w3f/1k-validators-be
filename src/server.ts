import Koa from "koa";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";
import Router from "@koa/router";

import { Config } from "./config";
import Database from "./db";
import logger from "./logger";
import ScoreKeeper from "./scorekeeper";
import { job } from "cron";
import { createTextChangeRange } from "typescript";

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
  sessionLocationStats: "/locationstats/:session",
};

export default class Server {
  public app: Koa;
  private db: Database;
  private port: number;

  constructor(db: Database, config: Config, scoreKeeper: ScoreKeeper) {
    this.app = new Koa();
    this.db = db;
    this.port = config.server.port;

    this.app.use(cors());
    this.app.use(bodyparser());

    const router = new Router();

    router.get(API.Accounting, async (ctx) => {
      const { stashOrController } = ctx.params;
      const accounting = await this.db.getAccounting(stashOrController);
      ctx.body = accounting;
    });

    router.get(API.Candidate, async (ctx) => {
      const { stashOrName } = ctx.params;
      const candidateData = await this.db.getCandidate(stashOrName);
      ctx.body = candidateData;
    });

    router.get(API.GetCandidates, async (ctx) => {
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
          };
        })
      );
      allCandidates = allCandidates.sort((a, b) => {
        return b.total - a.total;
      });
      ctx.body = allCandidates;
    });

    router.get(API.GetNodes, async (ctx) => {
      const allNodes: Array<any> = await this.db.allNodes();
      ctx.body = allNodes;
    });

    router.get(API.GetNominators, async (ctx) => {
      const allNominators = await this.db.allNominators();
      ctx.body = allNominators;
    });

    router.get(API.Release, async (ctx) => {
      const release = await this.db.getLatestRelease();
      ctx.body = release;
    });

    router.get(API.GetNominator, async (ctx) => {
      const { stash } = ctx.params;
      const nominator = await this.db.getNominator(stash);
      ctx.body = nominator;
    });

    router.get(API.GetNominations, async (ctx) => {
      const allNominations = await this.db.allNominations();
      ctx.body = allNominations;
    });

    router.get(API.GetNominatorNominations, async (ctx) => {
      const { address, last } = ctx.params;
      last ? Number(last) : 30;
      const nominations = await this.db.getLastNominations(address, last);
      ctx.body = nominations;
    });

    router.get(API.GetBotClaimEvents, async (ctx) => {
      const allNominations = await this.db.getBotClaimEvents();
      ctx.body = allNominations;
    });

    router.get(API.Health, (ctx) => {
      const network = config.global.networkPrefix == 2 ? "Kusama" : "Polkadot";
      ctx.body = `${network} Thousand Validators v2.2.5`;
      ctx.status = 200;
    });

    router.get(API.EraPoints, async (ctx) => {
      const { stash } = ctx.params;
      const latestEra = (await this.db.getLastTotalEraPoints())[0].era;
      const eraPoints = await this.db.getHistoryDepthEraPoints(
        stash,
        latestEra
      );
      ctx.body = eraPoints;
    });

    router.get(API.TotalEraPoints, async (ctx) => {
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
      const lastNomiation = await this.db.getLastNominatedEraIndex();
      ctx.body = lastNomiation;
    });

    router.get(API.ProxyTxs, async (ctx) => {
      const proxyTxs = await this.db.getAllDelayedTxs();
      ctx.body = proxyTxs;
    });

    router.get(API.EraStats, async (ctx) => {
      const latestEraStats = await this.db.getLatestEraStats();
      ctx.body = latestEraStats;
    });

    router.get(API.Score, async (ctx) => {
      const { stash } = ctx.params;
      const score = await this.db.getValidatorScore(stash);
      ctx.body = score;
    });

    router.get(API.ScoreMetadata, async (ctx) => {
      const score = await this.db.getValidatorScoreMetadata();
      ctx.body = score;
    });

    router.get(API.LocationStats, async (ctx) => {
      const locationStats = await this.db.getLatestLocationStats();
      ctx.body = locationStats;
    });
    router.get(API.LocationStats, async (ctx) => {
      const { session } = ctx.params;
      const locationStats = await this.db.getSessionLocationStats(session);
      ctx.body = locationStats;
    });

    this.app.use(router.routes());
  }

  start(): void {
    logger.info(`Now listening on ${this.port}`);
    this.app.listen(this.port);
  }
}
