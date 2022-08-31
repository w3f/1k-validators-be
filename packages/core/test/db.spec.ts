import test, { ExecutionContext } from "ava";
import Database, { NodeDetails } from "../src/db";
import { getNow } from "../src/util";

import { MongoMemoryServer } from "mongodb-memory-server";

type TestExecutionContext = ExecutionContext<{
  db: Database;
  mongod: MongoMemoryServer;
}>;

test.serial.before(async (t: TestExecutionContext) => {
  t.timeout(600000);

  if (process.env.CI) {
    console.log("in ci");
    t.context.mongod = await MongoMemoryServer.create({
      binary: {
        version: "latest",
      },
    });
  } else {
    t.context.mongod = await MongoMemoryServer.create();
  }
  const uri = await t.context.mongod.getUri();
  t.context.db = await Database.create(uri);
});

test.serial.after(async (t: TestExecutionContext) => {
  await t.context.mongod.stop();
});

test.serial("Created a new Database", async (t: TestExecutionContext) => {
  t.truthy(t.context.db);
});

test.serial(
  "addCandidate() adds a new candidate before node online",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const candidates = await db.allCandidates();
    t.deepEqual(candidates, []);

    await db.addCandidate("One", "stashOne", "", false);

    const candidatesAfter = await db.allCandidates();

    const thisCandidate = candidatesAfter[0];
    t.truthy(thisCandidate);

    t.is(thisCandidate.name, "One");
    t.is(thisCandidate.stash, "stashOne");
  }
);

test.serial(
  "reportOnline() reports a node online",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nodeDetails: NodeDetails = ["One", "", "", "", "1"];

    const oldNodes = await db.allNodes();

    t.is(oldNodes.length, 1);

    const now = getNow();
    await db.reportOnline(1, nodeDetails, now);

    const newNodes = await db.allNodes();

    const thisNode = newNodes[0];
    t.truthy(thisNode);

    t.is(thisNode.name, "One");
    t.is(thisNode.nodeRefs, 1);
    t.is(thisNode.discoveredAt, now);
    t.is(thisNode.nominatedAt, 0);
    t.is(thisNode.onlineSince, now);
    t.false(thisNode.updated);
    t.is(thisNode.offlineSince, 0);
    t.is(thisNode.offlineAccumulated, 0);
    t.is(thisNode.rank, 0);
    t.is(thisNode.faults, 0);
    t.is(thisNode.stash, "stashOne"); // Registered already.
  }
);

test.serial(
  "reportOffline() reports a node offline",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nodeOneBefore = await db.getCandidate("stashOne");
    t.is(nodeOneBefore.offlineSince, 0);
    t.is(nodeOneBefore.offlineAccumulated, 0);
    t.true(nodeOneBefore.onlineSince > 1);

    const now = getNow();
    await db.reportOffline(1, "One", now);

    const nodeOneAfter = await db.getCandidate("stashOne");
    t.is(nodeOneAfter.offlineSince, now);
    t.is(nodeOneAfter.onlineSince, 0);
  }
);

test.serial(
  "reportOnline() records the accumulated time",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nodeOneOffline = await db.getCandidate("stashOne");
    t.true(nodeOneOffline.offlineSince > 0);
    t.is(nodeOneOffline.onlineSince, 0);

    const now = getNow();
    await db.reportOnline(1, ["One", "", "", "", "1"], now);

    const nodeOneOnline = await db.getCandidate("stashOne");
    t.is(nodeOneOnline.offlineSince, 0);
    t.is(nodeOneOnline.offlineAccumulated, now - nodeOneOffline.offlineSince);
    t.is(nodeOneOnline.onlineSince, now);
  }
);

test.serial(
  "addCandidate() adds candidate after node is online",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nodeTwo = await db.getNodeByName("nodeTwo");
    t.is(nodeTwo, null); // not around yet

    const now = getNow();
    await db.reportOnline(2, ["nodeTwo", "", "", "", "2"], now);

    const nodeTwoAfter = await db.getNodeByName("nodeTwo");
    t.is(nodeTwoAfter.onlineSince, now);
    t.is(nodeTwoAfter.stash, undefined);

    await db.addCandidate("nodeTwo", "stashTwo", "", false);

    const nodeTwoLatest = await db.getNodeByName("nodeTwo");
    t.is(nodeTwoLatest.stash, "stashTwo");
  }
);

test.serial(
  "getValidator() gets a candidate by using stash",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const candidate = await db.getCandidate("stashTwo");
    t.is(candidate.name, "nodeTwo");
  }
);

test.serial(
  "addNominator() adds a new nominator to the db",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nominators = await db.allNominators();
    t.deepEqual(nominators, []);

    const now = getNow();
    await db.addNominator("nominator_one", now);

    const nominator = await db.getNominator("nominator_one");

    t.is(nominator.nominatedAt, undefined);
    t.is(nominator.createdAt, now);
    t.deepEqual(Array.from(nominator.current), []);
  }
);

test.serial(
  "newTargets() adds targets for the nominator",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nomBefore = await db.getNominator("nominator_one");
    t.deepEqual(Array.from(nomBefore.current), []);
    t.is(nomBefore.nominatedAt, undefined);

    const now = getNow();
    await db.setTarget("nominator_one", "stashOne", now);
    await db.setTarget("nominator_one", "stashTwo", now);
    await db.setLastNomination("nominator_one", now);

    const nomAfter = await db.getNominator("nominator_one");
    t.is(nomAfter.lastNomination, now);
    t.deepEqual(Array.from(nomAfter.current), ["stashOne", "stashTwo"]);
  }
);

test.serial(
  "getCurrentTargets() returns the expected values",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const currentTargets = await db.getCurrentTargets("nominator_one");
    t.deepEqual(Array.from(currentTargets), ["stashOne", "stashTwo"]);
  }
);

test.serial(
  "setTarget() sets a single target",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const now = getNow();

    await db.setTarget("nominator_one", "stashThree", now);
    const data = await db.getNominator("nominator_one");
    t.deepEqual(Array.from(data.current), [
      "stashOne",
      "stashTwo",
      "stashThree",
    ]);
  }
);

test.serial(
  "Clears all the candidates (used at beginning of restarts)",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const nodesBefore = await db.allNodes();
    for (const node of nodesBefore) {
      if (node.name === "One") {
        t.is(node.stash, "stashOne");
      }
      if (node.name === "nodeTwo") {
        t.is(node.stash, "stashTwo");
      }
    }

    await db.clearCandidates();

    const nodesAfter = await db.allNodes();
    for (const node of nodesAfter) {
      t.is(node.stash, null);
    }
  }
);

test.serial(
  "Checks that lastNominatedEraIndex can be set and gotten",
  async (t: TestExecutionContext) => {
    const { db } = t.context;

    const before = await db.getLastNominatedEraIndex();
    t.is(before.lastNominatedEraIndex, "0");

    await db.setLastNominatedEraIndex(1269);

    const after = await db.getLastNominatedEraIndex();
    t.is(after.lastNominatedEraIndex, "1269");
  }
);
