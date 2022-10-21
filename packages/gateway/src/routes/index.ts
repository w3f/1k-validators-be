import { candidate } from "../controllers";

import { logger } from "@1kv/common";

import Router from "@koa/router";

const router = new Router();

router.get("/candidate/:stash", candidate.getCandidate);

export default router;
