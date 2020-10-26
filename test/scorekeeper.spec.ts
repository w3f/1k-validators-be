import test, { ExecutionContext } from "ava";
import Db from "../src/db";
import Scorekeeper from "../src/scorekeeper";
import { sleep } from "../src/util";

import { MockApi, MockConfig, MockDb } from "./mock";
import MockNominator from "./mock/nominator";

type TestExecutionContext = ExecutionContext<{ db: Db; sk: Scorekeeper }>;

test.serial.before((t: TestExecutionContext) => {
  const sk = new Scorekeeper(MockApi as any, MockDb as any, MockConfig);
  t.is(MockApi, sk.api as any);
  t.is(MockDb, sk.db as any);
  t.is(MockConfig, sk.config);

  t.context.db = sk.db;
  t.context.sk = sk;
});

test("Can addNominatorGroup and fake begin()", async (t: TestExecutionContext) => {
  const { db, sk } = t.context;

  const seed = "0x" + "00".repeat(32);
  await sk.addNominatorGroup([{ seed }]);
  // Call spawn directly in order to get the Nominator object.
  const nom = sk._spawn(seed);
  const nominators = await db.allNominators();
  t.is(nom.address, nominators[0].nominator);
  t.is(sk.nominatorGroups[0][0].address, nominators[0].nominator);

  await t.notThrowsAsync(sk.begin("* * * * * *"));
});

test("Can add multiple nominators and nominator groups", async (t: TestExecutionContext) => {
  const { db, sk } = t.context;

  const seeds = [...Array(8).keys()].map(
    (i) => "0x" + "00".repeat(31) + "0" + i.toString()
  );

  const groupOne = seeds.slice(0, 4).map((seed) => ({ seed }));
  const groupTwo = seeds.slice(4).map((seed) => ({ seed }));

  await sk.addNominatorGroup(groupOne);
  await sk.addNominatorGroup(groupTwo);

  
});

test("addPoint() and dockPoints() works", async (t: TestExecutionContext) => {
  //@ts-ignore
  const { db, sk } = t.context;

  const four = 4;
  for (let i = 0; i < four; i++) {
    await sk.addPoint("stash0");
  }
  const data = await db.getValidator("stash0");
  t.is(data.rank, 4);
  t.is(data.misbehaviors, 0);

  const before = new Date().getTime();
  await sk.dockPoints("stash0");

  const dataAgain = await db.getValidator("stash0");
  t.is(dataAgain.rank, 2);
  t.is(dataAgain.misbehaviors, 1);
});

test("It gets the right results from _doNominations()", async (t: TestExecutionContext) => {
  //@ts-ignore
  const sk = new Scorekeeper(MockApi, MockDb, MockConfig);

  // Mock the nominator groups.
  const nominatorGroups = [
    [MockNominator, MockNominator],
    [MockNominator, MockNominator, MockNominator],
  ];

  const set = Array.from(Array(45).keys());
  await sk._doNominations(set, 16, nominatorGroups);
  t.pass();
});

test("startRound() adds an empty round in db and makes nominations", async (t: TestExecutionContext) => {
  t.pass(); // TODO
});

test("endRound() completes the round", async (t: TestExecutionContext) => {
  t.pass(); // TODO
});
