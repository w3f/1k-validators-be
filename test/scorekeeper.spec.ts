import test from 'ava';
import Database from '../src/db';
import Scorekeeper from '../src/scorekeeper';
import { sleep } from '../src/util';

import {
	MockApi,
	MockConfig,
	MockDb,
} from './mock';

import { wipe } from './helpers';

test.before(async (t: any) => {
	wipe('test.db')
	const db = new Database('test.db');

	const now = new Date().getTime();

	await db.reportOnline(0, ['nodeZero'], now);
	await db.addCandidate('nodeZero', 'stash0');

	await db.reportOnline(1, ['nodeOne'], now);
	await db.addCandidate('nodeOne', 'stash1');

	//@ts-ignore
	t.context.sk = new Scorekeeper(MockApi, db, MockConfig);
	t.context.db = db;
	
	await sleep(1200);
});

test.after(() => {
	wipe('test.db');
});

test('Creates a new Scorekeeper', (t: any) => {
	//@ts-ignore
	const sk = new Scorekeeper(MockApi, MockDb, MockConfig);
	t.is(MockApi, sk.api);
	t.is(MockDb, sk.db);
	t.is(MockConfig, sk.config);
});

test('_getSet() returns the expected nodes', async (t: any) => {
	//@ts-ignore
	const sk = new Scorekeeper(MockApi, MockDb, MockConfig);
	const set = await sk._getSet();
	t.is(set.length, 2);
	t.is(set[0].name, MockDb.allNodes()[1].name);
	t.is(set[1].name, MockDb.allNodes()[0].name);
	t.is(set.length, 2);
});

test('Can addNominatorGroup and fake begin()', async (t: any) => {
	const seed = '0x' + '00'.repeat(32);
	const { db, sk } = t.context;

	await sk.addNominatorGroup([{ seed }]);
	// Call spawn directly in order to get the Nominator object.
	const nom = sk._spawn(seed);
	const nominators = await db.allNominators();
	t.is(nom.address, nominators[0].nominator);
	t.is(sk.nominatorGroups[0][0].address, nominators[0].nominator);

	await t.notThrowsAsync(sk.begin('* * * * * *'));
});

test('addPoint() and dockPoints() works', async (t: any) => {
	//@ts-ignore
	const { db, sk } = t.context;

	const four = 4;
	for (let i = 0; i < four; i++) {
		await sk.addPoint('stash0');
	}
	const data = await db.getValidator('stash0');
	t.is(data.rank, 4);
	t.is(data.misbehaviors, 0);

	const before = new Date().getTime();
	await sk.dockPoints('stash0');

	const dataAgain = await db.getValidator('stash0');
	t.is(dataAgain.rank, 2);
	t.is(dataAgain.misbehaviors, 1);
	t.true(before <= dataAgain.goodSince);
});

test('It gets the right results from _doNominations()', async (t: any) => {
	//@ts-ignore
	const sk = new Scorekeeper(MockApi, MockDb, MockConfig);

	const FakeNominator = {
		nominate: () => {
			return true;
		}
	}

	// Mock the nominator groups.
	const nominatorGroups = [
		[FakeNominator, FakeNominator],
		[FakeNominator,FakeNominator,FakeNominator],
	];

	const set = Array.from(Array(45).keys());
	await sk._doNominations(set, 16, nominatorGroups);
	t.pass();
});

test('It survives across restarts', async (t: any) => {
	t.pass();
});

test('startRound() adds an empty round in db and makes nominations', async (t: any) => {
	t.pass();
});

test('endRound() completes the round', async (t: any) => {
	t.pass();
});
