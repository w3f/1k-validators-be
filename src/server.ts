import Koa from "koa";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";
import Router from "@koa/router";

import { Config } from "./config";
import Database from "./db";
import logger from "./logger";
import ScoreKeeper from "./scorekeeper";

const API = {
  Accounting: "/accounting/:stashOrController",
  Candidate: "/candidate/:stashOrName",
  GetCandidates: "/candidates",
  GetNodes: "/nodes",
  GetNominators: "/nominators",
  GetNominations: "/nominations",
  GetBotClaimEvents: "/claims",
  Health: "/healthcheck",
  Invalid: "/invalid",
  ValidCandidates: "/valid",
  EraPoints: "/erapoints/:stash",
  LastNomination: "/lastnomination",
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
      const allCandidates = await this.db.allCandidates();
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

    router.get(API.GetNominations, async (ctx) => {
      const allNominations = await this.db.allNominations();
      ctx.body = allNominations;
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

    router.get(API.Invalid, (ctx) => {
      const result = scoreKeeper.constraints.invalidCandidateCache;
      ctx.body = result.filter((item) => !!item).join("\n");
    });

    router.get(API.ValidCandidates, (ctx) => {
      const valid = scoreKeeper.constraints.validCandidateCache;
      ctx.body = valid;
    });

    router.get(API.EraPoints, async (ctx) => {
      const { stash } = ctx.params;
      const latestEra = (await this.db.getLastTotalEraPoints())[0].era;
      console.log(latestEra);
      const eraPoints = await this.db.getHistoryDepthEraPoints(
        stash,
        latestEra
      );
      ctx.body = eraPoints;
    });

    router.get(API.LastNomination, async (ctx) => {
      const lastNomiation = await this.db.getLastNominatedEraIndex();
      ctx.body = lastNomiation;
    });

    this.app.use(router.routes());
  }

  start(): void {
    logger.info(`Now listening on ${this.port}`);
    this.app.listen(this.port);
  }
}
