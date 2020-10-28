import Koa from "koa";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";

import { Config } from "./config";
import Database from "./db";
import logger from "./logger";
import ScoreKeeper from "./scorekeeper";

const API = {
  GetCandidates: "/candidates",
  GetNodes: "/nodes",
  GetNominators: "/nominators",
  ValidCandidates: "/valid",
  Health: "/healthcheck",
  Invalid: "/invalid",
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

    this.app.use(async (ctx) => {
      switch (ctx.url.toLowerCase()) {
        case API.ValidCandidates:
          {
            const valid = scoreKeeper.constraints.validCandidateCache;
            ctx.body = valid;
          }
          break;
        case API.Invalid:
          {
            const result = scoreKeeper.constraints.invalidCandidateCache;
            ctx.body = result.filter((item) => !!item).join("\n");
          }
          break;
        case API.GetCandidates:
          {
            const allCandidates = await this.db.allCandidates();
            ctx.body = allCandidates;
          }
          break;
        case API.GetNodes:
          {
            const allNodes: Array<any> = await this.db.allNodes();
            ctx.body = allNodes;
          }
          break;
        case API.GetNominators:
          {
            const allNominators = await this.db.allNominators();
            ctx.body = allNominators;
          }
          break;
        case API.Health:
          {
            ctx.body = true;
            ctx.status = 200;
          }
          break;
        default:
          ctx.body = "Invalid api endpoint.";
          ctx.status = 404;
      }
    });
  }

  start(): void {
    logger.info(`Now listening on ${this.port}`);
    this.app.listen(this.port);
  }
}
