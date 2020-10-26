import test, { ExecutionContext } from "ava";
import Db from "../src/db";
import Scorekeeper from "../src/scorekeeper";

import { MockApi, MockConfig } from "./mock";
import MockDb from "./mock/db";

type TestExecutionContext = ExecutionContext<{ db: Db; sk: Scorekeeper }>;

test.serial.before(async (t: TestExecutionContext) => {
  const sk = new Scorekeeper(MockApi as any, new MockDb() as any, MockConfig);
  t.is(MockApi, sk.api as any);
  t.is(MockConfig, sk.config);

  t.context.sk = sk;

  // Waits for WASM to be initialized.
  await new Promise((resolve) => setTimeout(() => resolve(), 2000));
});

test.serial(
  "Can addNominatorGroup and fake begin()",
  async (t: TestExecutionContext) => {
    const { sk } = t.context;

    const seed = "0x" + "00".repeat(32);
    t.assert(
      await sk.addNominatorGroup([{ seed }]),
      "Unable to add nominator group with one seed."
    );

    const nominatorGroups = sk.nominatorGroups;
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

    await sk.addNominatorGroup(groupOne);
    await sk.addNominatorGroup(groupTwo);
  }
);
