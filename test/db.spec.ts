import test from 'ava';
import Database from '../src/db';

import * as fs from 'fs';

import { wipe } from './helpers';

test.before((t:any) => {
  wipe('test.db');
  wipe('combined.log');
  t.context.db = new Database('test.db');
});

test.after((t: any) => {
  wipe('test.db');
  wipe('combined.log');
});

test.serial('Created a new Database', async (t: any) => {
  t.truthy(t.context.db);
});

test.serial('addCandidate() adds a new candidate', async (t: any) => {
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

  const nodeDetails = ['One'];

  const oldNodes = await db.allNodes();
  t.deepEqual(oldNodes, []); // no node reported online

  const now = new Date().getTime();
  await db.reportOnline(1, nodeDetails, now);

  const newNodes = await db.allNodes();

  const thisNode = newNodes[0];
  t.truthy(thisNode);

  t.is(thisNode.id, 1);
  t.is(thisNode.name, 'One');
  t.is(thisNode.connectedAt, now);
  t.is(thisNode.nominatedAt, 0);
  t.is(thisNode.goodSince, now);
  t.is(thisNode.offlineSince, 0);
  t.is(thisNode.offlineAccumulated, 0);
  t.is(thisNode.rank, 0);
  t.is(thisNode.misbehaviors, 0);
  t.is(thisNode.stash, null);
});

test.serial('reportOffline() reports a node offline', async (t: any) => {
  const { db } = t.context;

  const nodeOneBefore = await db.getNode(1);
  t.is(nodeOneBefore.id, 1);
  t.is(nodeOneBefore.offlineSince, 0);
  t.is(nodeOneBefore.offlineAccumulated, 0);
  t.true(nodeOneBefore.goodSince > 1);

  const now = new Date().getTime();
  await db.reportOffline(1, now);

  const nodeOneAfter = await db.getNode(1);
  t.is(nodeOneAfter.offlineSince, now);
  t.is(nodeOneAfter.goodSince, 0);
});

test.serial('reportOnline() records the accumulated time', async (t: any) => {
  const { db } = t.context;

  const nodeOneOffline = await db.getNode(1);
  t.true(nodeOneOffline.offlineSince > 0);
  t.is(nodeOneOffline.goodSince, 0);

  const now = new Date().getTime();
  await db.reportOnline(1, [], now);

  const nodeOneOnline = await db.getNode(1);
  t.is(nodeOneOnline.offlineSince, 0);
  t.is(nodeOneOnline.offlineAccumulated, now - nodeOneOffline.offlineSince);
  t.is(nodeOneOnline.goodSince, now);
});
