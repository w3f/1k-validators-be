import test from 'ava';
import Database from '../src/db';
import { getNow } from '../src/util';

import { MongoMemoryServer } from 'mongodb-memory-server';

test.before(async (t:any) => {
  t.context.mongod = new MongoMemoryServer();
  const uri = await t.context.mongod.getUri();
  t.context.db = await Database.makeDB({
    uri,
    dbName: 'test',
    collection: 'test',
  });
});

test.after(async (t:any) => {
  t.context.mongod.stop();
});

test.serial('Created a new Database', async (t: any) => {
  t.truthy(t.context.db);
});

test.serial('addCandidate() adds a new candidate before node online', async (t: any) => {
  const { db } = t.context;

  const candidates = await db.allCandidates();
  t.deepEqual(candidates, []);

  await db.addCandidate('One', 'stashOne');

  const candidatesAfter = await db.allCandidates();

  const thisCandidate = candidatesAfter[0];
  t.truthy(thisCandidate);

  t.is(thisCandidate.id, null);
  t.is(thisCandidate.name, 'One');
  t.is(thisCandidate.stash, 'stashOne');
});

test.serial('reportOnline() reports a node online', async (t: any) => {
  const { db } = t.context;

  const nodeDetails = ['One', '', '', '', '1'];

  const oldNodes = await db.allNodes();
  t.deepEqual(oldNodes, []); // no node reported online

  const now = getNow();
  await db.reportOnline(1, nodeDetails, now);

  const newNodes = await db.allNodes();

  const thisNode = newNodes[0];
  t.truthy(thisNode);

  t.is(thisNode.id, 1);
  t.is(thisNode.networkId, '1');
  t.is(thisNode.name, 'One');
  t.is(thisNode.connectedAt, now);
  t.is(thisNode.nominatedAt, 0);
  t.is(thisNode.goodSince, now);
  t.is(thisNode.offlineSince, 0);
  t.is(thisNode.offlineAccumulated, 0);
  t.is(thisNode.rank, 0);
  t.is(thisNode.misbehaviors, 0);
  t.is(thisNode.stash, 'stashOne'); // Registered already.
});

test.serial('reportOffline() reports a node offline', async (t: any) => {
  const { db } = t.context;

  const nodeOneBefore = await db.getNode('1');
  t.is(nodeOneBefore.networkId, '1');
  t.is(nodeOneBefore.offlineSince, 0);
  t.is(nodeOneBefore.offlineAccumulated, 0);
  t.true(nodeOneBefore.goodSince > 1);

  const now = getNow();
  await db.reportOffline(1, '1', now);

  const nodeOneAfter = await db.getNode('1');
  t.is(nodeOneAfter.offlineSince, now);
  t.is(nodeOneAfter.goodSince, 0);
});

test.serial('reportOnline() records the accumulated time', async (t: any) => {
  const { db } = t.context;

  const nodeOneOffline = await db.getNode('1');
  t.true(nodeOneOffline.offlineSince > 0);
  t.is(nodeOneOffline.goodSince, 0);

  const now = getNow();
  await db.reportOnline(1, ['','','','','1'], now);

  const nodeOneOnline = await db.getNode('1');
  t.is(nodeOneOnline.offlineSince, 0);
  t.is(nodeOneOnline.offlineAccumulated, now - nodeOneOffline.offlineSince);
  t.is(nodeOneOnline.goodSince, now);
});

test.serial('addCandidate() adds candidate after node is online', async (t: any) => {
  const { db } = t.context;

  const nodeTwo = await db.getNode('2');
  t.is(nodeTwo, undefined); // not around yet

  const now = getNow();
  await db.reportOnline(2, ['nodeTwo', '', '', '', '2'], now);

  const nodeTwoAfter = await db.getNode('2');
  t.is(nodeTwoAfter.goodSince, now);
  t.is(nodeTwoAfter.stash, null);

  await db.addCandidate('nodeTwo', 'stashTwo');
  
  const nodeTwoLatest = await db.getNode('2');
  t.is(nodeTwoLatest.stash, 'stashTwo');
});

test.serial('addNominator() adds a new nominator to the db', async (t: any) => {
  const { db } = t.context;

  const nominators = await db.allNominators();
  t.deepEqual(nominators, []);

  const now = getNow();
  await db.addNominator('nominator_one', now);

  const nominator = await db.getNominator('nominator_one');

  t.is(nominator.nominatedAt, null);
  t.is(nominator.firstSeen, now);
  t.is(nominator.lastSeen, now);
  t.deepEqual(nominator.current, []);
});

test.serial('newTargets() adds targets for the nominator', async (t: any) => {
  const { db } = t.context;

  const nomBefore = await db.getNominator('nominator_one');
  t.deepEqual(nomBefore.current, []);
  t.is(nomBefore.nominatedAt, null);

  const now = getNow();
  await db.newTargets('nominator_one', ['stashOne', 'stashTwo'], now);

  const nomAfter = await db.getNominator('nominator_one');
  t.is(nomAfter.nominatedAt, now);
  t.is(nomAfter.lastSeen, now);
  t.deepEqual(nomAfter.current, ['stashOne', 'stashTwo']);
});

test.serial('getCurrentTargets() returns the expected values', async (t: any) => {
  const { db } = t.context;

  const currentTargets = await db.getCurrentTargets('nominator_one');
  t.deepEqual(currentTargets, ['stashOne', 'stashTwo']);
});

test.serial('setNominatedAt() sets nominatedAt for node', async (t: any) => {
  const { db } = t.context;

  const now = getNow();
  await db.setNominatedAt('stashOne', now);

  // TODO
  t.pass();
});

test.serial('setTarget() sets a single target', async (t: any) => {
  const { db } = t.context;

  const now = getNow();

  await db.setTarget('nominator_one', 'stashThree', now);
  const data = await db.getNominator('nominator_one');
  t.deepEqual(data.current, ['stashOne', 'stashTwo', 'stashThree']);
  t.is(data.nominatedAt, now);
  t.is(data.lastSeen, now);
});


test.serial('Clears all the candidates (used at beginning of restarts)', async (t: any) => {
  const { db } = t.context;

  const nodesBefore = await db.allNodes();
  for (const node of nodesBefore) {
    if (node.name === 'One') {
      t.is(node.stash, 'stashOne');
    }
    if (node.name === 'nodeTwo') {
      t.is(node.stash, 'stashTwo');
    }
  }

  await db.clearCandidates();

  const nodesAfter = await db.allNodes();
  for (const node of nodesAfter) {
    t.is(node.stash, null);
  }
});
