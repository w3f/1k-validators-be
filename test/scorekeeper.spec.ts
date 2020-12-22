import test, { ExecutionContext } from "ava";
import Db from "../src/db";
import Scorekeeper from "../src/scorekeeper";
import { CandidateData } from "../src/types";

import { MockApi, MockConfig } from "./mock";
import MockDb from "./mock/db";

type TestExecutionContext = ExecutionContext<{ db: Db; sk: Scorekeeper }>;

test.serial.before(async (t: TestExecutionContext) => {
  const sk = new Scorekeeper(
    MockApi as any,
    new MockDb() as any,
    MockConfig as any
  );
  t.is(MockApi, sk.handler as any);
  t.is(MockConfig, sk.config);

  t.context.sk = sk;

  // Waits for WASM to be initialized.
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 2000));
});

test.serial(
  "Can addNominatorGroup and fake begin()",
  async (t: TestExecutionContext) => {
    const { sk } = t.context;

    const seed = "0x" + "00".repeat(32);
    t.assert(
      await sk.addNominatorGroup([{ seed } as any]),
      "Unable to add nominator group with one seed."
    );

    const nominatorGroups = sk.getAllNominatorGroups();
    t.is(nominatorGroups.length, 1);
    t.is(nominatorGroups[0].length, 1);
  }
);

test.serial(
  "Can add multiple nominators in nominator groups",
  async (t: TestExecutionContext) => {
    const { sk } = t.context;

    const seeds = [...Array(8).keys()].map(
      (i) => "0x" + "00".repeat(31) + "0" + i.toString()
    );

    const groupOne = seeds.slice(0, 4).map((seed) => ({ seed }));
    const groupTwo = seeds.slice(4).map((seed) => ({ seed }));

    t.assert(
      (await sk.addNominatorGroup(groupOne as any)) &&
        (await sk.addNominatorGroup(groupTwo as any)),
      "Cannot add multiple nominator groups."
    );

    const nomGroupOne = sk.getNominatorGroupAtIndex(0);
    t.is(nomGroupOne.length, 1);
    const nomGroupTwo = sk.getNominatorGroupAtIndex(1);
    t.is(nomGroupTwo.length, 4);
    const nomGroupThree = sk.getNominatorGroupAtIndex(2);
    t.is(nomGroupThree.length, 4);

    const allControllers = sk.getAllNominatorControllers();
    t.is(allControllers.length, 9);
  }
);

test.serial(
  "doNominations() works properly with multiple nominator groups",
  async (t: TestExecutionContext) => {
    const { sk } = t.context;

    const nominatorGroups = sk.getAllNominatorGroups();
    const candidates = [...Array(120).keys()].map((item) => {
      return {
        id: item,
        networkId: item.toString(),
        name: item.toString(),
        details: [],
        connectedAt: 0,
        nominatedAt: 0,
        offlineSince: 0,
        offlineAccumulated: 0,
        onlineSince: 0,
        updated: false,
        rank: 0,
        misbehaviors: 0,
        stash: item.toString(),
      } as CandidateData;
    });

    const totalTargets = await sk._doNominations(
      candidates,
      16,
      nominatorGroups,
      true
    );

    t.deepEqual(
      totalTargets,
      candidates.map((c) => c.name)
    );

    const nomGroupZero = sk.getNominatorGroupAtIndex(0);
    const zeroZeroTargets = await sk.db.getCurrentTargets(
      nomGroupZero[0].controller
    );
    t.is(zeroZeroTargets.length, 16);
    t.deepEqual(totalTargets.slice(0, 16), zeroZeroTargets);

    const nomGroupOne = sk.getNominatorGroupAtIndex(1);
    const oneZeroTargets = await sk.db.getCurrentTargets(
      nomGroupOne[0].controller
    );
    const oneOneTargets = await sk.db.getCurrentTargets(
      nomGroupOne[1].controller
    );
    const oneTwoTargets = await sk.db.getCurrentTargets(
      nomGroupOne[2].controller
    );
    const oneThreeTargets = await sk.db.getCurrentTargets(
      nomGroupOne[3].controller
    );
    t.is(oneZeroTargets.length, 16);
    t.is(oneOneTargets.length, 16);
    t.is(oneTwoTargets.length, 16);
    t.is(oneThreeTargets.length, 16);
    t.deepEqual(oneZeroTargets, totalTargets.slice(0, 16));
    t.deepEqual(oneOneTargets, totalTargets.slice(16, 32));
    t.deepEqual(oneTwoTargets, totalTargets.slice(32, 48));
    t.deepEqual(oneThreeTargets, totalTargets.slice(48, 64));
  }
);
