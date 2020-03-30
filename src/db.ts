import MongoClient from 'mongodb';

import logger from './logger';
import {Address, Stash, CandidateData} from './types';

export type DbConf = {
  uri: string,
  dbName: string
  collection: string,
}

export default class Database {
  private _db: any;

  constructor(collection) {
    this._db = collection;
  }

  static makeDB = async (dbConf: DbConf): Promise<Database> => {
    const mongo = await MongoClient.connect(dbConf.uri);
    const db = await mongo.db(dbConf.dbName);
    const collection = db.collection(dbConf.collection);
    return new Database(collection);
  }

  /// Entry point for adding a new candidate.
  async addCandidate(name: string, stash: string, sentryId: string) {
    logger.info(`(DB::addCandidate) Adding candidate ${name}`);

    const oldData = await this._queryOne({ name });
    if (!oldData) {
      logger.info(`(DB::addCandidate) Could not find candidate node ${name} - inserting`);
      
      const data: CandidateData = {
        id: null,
        name,
        networkId: null,
        details: [],
        connectedAt: 0,
        nominatedAt: 0,
        offlineSince: 0,
        offlineAccumulated: 0,
        rank: 0,
        misbehaviors: 0,
        stash,
        sentryId,
        sentryOfflineSince: 0,
        sentryOnlineSince: 0,
      };

      return this._insert(data);
    }
    const newData = Object.assign(oldData, {
      stash,
      sentryId,
    });
    return this._update({ name }, newData);
  }

  /// Entry point for entering a new nominator to the db.
  async addNominator(address: Address, now: number): Promise<boolean> {
    logger.info(`(DB::addNominator) Adding nominator ${address}`);

    const oldData = await this._queryOne({ nominator: address });
    if (!oldData) {
      logger.info(`(DB::addNominator) ${address} seen for the first time`);
      const data = {
        nominator: address,
        current: [],
        nominatedAt: null,
        firstSeen: now,
        lastSeen: now,
      };

      return this._insert(data);
    }

    const newData = Object.assign(oldData, {
      lastSeen: now,
    });

    return this._update({ nominator: address }, newData);
  }

  async newTargets(address: Address, targets: Stash[], now: number): Promise<boolean> {
    logger.info(`(DB::newTargets) Adding new targets for ${address} | targets: ${JSON.stringify(targets)}`);

    const oldData = await this._queryOne({ nominator: address });
    const newData = Object.assign(oldData, {
      current: targets,
      nominatedAt: now,
      lastSeen: now,
    });

    return this._update({ nominator: address }, newData);
  }

  async getCurrentTargets(address: Address): Promise<Stash[]> {
    logger.info(`(DB::getCurrentTargets) Getting targets for ${address}`);
    
    //@ts-ignore
    return (await this._queryOne({ nominator: address })).current;
  }

  async setNominatedAt(stash: Stash, now: number) {
    logger.info(`(DB::setNominatedAt) Setting nominated at ${now}`);

    const oldData = await this._queryOne({ stash });
    if (!oldData) {
      throw new Error('Expected an old data entry; qed');
    }

    const newData = Object.assign(oldData, {
      nominatedAt: now,
    });
    return this._update({ stash }, newData);
  }

  async setTarget(nominator: Address, stash: Stash, now: number) {
    logger.info(`(DB::setTarget) Setting target for nominator ${nominator} | stash = ${stash}`);

    const oldData = await this._queryOne({ nominator });
    const newData = Object.assign(oldData, {
      current: [...oldData.current, stash],
      nominatedAt: now,
      lastSeen: now, 
    });

    logger.info(`(DB::setTarget) OLDDATA ${JSON.stringify(oldData)} | NEWDATA ${JSON.stringify(newData)} | nominator ${nominator} | stash = ${stash}`);
    return this._update({ nominator }, newData);
  }

  /// Entry point for reporting a node is online.
  async reportOnline(id: number, details: Array<any>, now: number) {
    const name = details[0];
    const networkId = details[4];

    logger.info(`(DB::reportOnline) Reporting ${name} online.`)

    // Get the node by networkId.
    const oldData = await this._queryOne({ networkId });

    if (!oldData) {
      // If we haven't seen the node before, maybe we've registered it
      // by name already...
      const nameData = await this._queryOne({ name });
      if (!nameData) {
        // Truly a new node.
        const data = {
          id,
          networkId,
          name,
          details,
          connectedAt: now,
          nominatedAt: 0,
          goodSince: now,
          offlineSince: 0,
          offlineAccumulated: 0,
          rank: 0,
          misbehaviors: 0,
          stash: null,
          sentryOfflineSince: 0,
          sentryOnlineSince: 0,
        };

        return this._insert(data); 
      } else {
        // Already a candidate, record the node data now.
        const data = Object.assign(nameData, {
          id,
          networkId,
          details,
          connectedAt: now,
          nominatedAt: 0,
          goodSince: now,
          offlineSince: 0,
          offlineAccumulated: 0,
          rank: 0,
          misbehaviors: 0,
        });
        return this._update({ name: nameData.name }, data);
      }
    } else {
      /// This is a server restart ...
      if (Number(oldData.offlineSince) === 0) {
        return;
      }
      /// We've seen the node before, take stock of any offline time.
      const timeOffline = now - Number(oldData.offlineSince);
      const accumulated = Number(oldData.offlineAccumulated) + timeOffline;
      const newData = Object.assign(oldData, {
        // Should be the same in most scenarios but add it here just in case.
        id,
        // In case a new name is being used for the same network id.
        name,
        // Need to update details to see if it's updated it's node.
        details,
        offlineSince: 0,
        offlineAccumulated: accumulated,
        goodSince: now,
      });
      return this._update({ networkId }, newData);
    }
  }

  async reportOffline(id: number, networkId: string, now: number) {
    logger.info(`(DB::reportOffline) Reporting node with network id ${networkId} offline.`);
    // Query by network id because this should be safer than using id.
    const oldData = await this._queryOne({ networkId });
    if (id !== oldData.id) {
      logger.info(`Id mismatch for ${networkId}... still reporting offline.`);
    }
    const newData = Object.assign(oldData, {
      offlineSince: now,
      goodSince: 0,
    });

    return this._update({ networkId }, newData);
  }

  async reportSentryOnline(name: string, now: number) {
    logger.info(`(DB::reportSentryOnline) Reporting sentry for ${name} online.`);

    const candidateData = await this._queryOne({ name });
    if (candidateData.sentryOnlineSince === 0 || !candidateData.sentryOnlineSince) {
      const newData = Object.assign(candidateData, {
        sentryOnlineSince: now,
        sentryOfflineSince: 0,
      });
      return this._update({ name }, newData);
    }
  }

  async reportSentryOffline(name: string, now: number) {
    logger.info(`(DB::reportSentryOffline) Reporting sentry for ${name} offline.`);

    const candidateData = await this._queryOne({ name });
     if (candidateData.sentryOfflineSince === 0 || !candidateData.sentryOfflineSince) {
      const newData = Object.assign(candidateData, {
        sentryOnlineSince: 0,
        sentryOfflineSince: now,
      });
      return this._update({ name }, newData);
    }
  }

  async findSentry(sentryId: string): Promise<[boolean, string]> {
    logger.info(`(DB::findSentry) Looking for the sentry node ${sentryId}`);
    const allNodes = await this.allNodes();
    const found = allNodes.find((node) => {
      return node.details[4] === sentryId;
    });

    if (found) {
      logger.info(`(DB::findSentry) Found sentry node ${sentryId}.`);
      return [found.offlineSince === 0, found.name];
    }

    logger.info(`(DB::findSentry) Did not find sentry node ${sentryId}.`);
    return [false, 'not found'];
  }

  async nodeGood(networkId: string, now: number) {
    const oldData = await this._queryOne({ networkId });
    const newData = Object.assign(oldData, {
      goodSince: now,
    });

    return this._update({ networkId }, newData);
  }

  async nodeNotGood(networkId: string) {
    const oldData = await this._queryOne({ networkId });
    const newData = Object.assign(oldData, {
      goodSince: 0,
    });

    return this._update({ networkId }, newData);
  }

  /**
   * GETTERS / ACCESSORS
   */

  async getNode(networkId: string): Promise<any> {
    const allNodes = await this.allNodes();
    const found = allNodes.find((node: any) => {
      return node.networkId === networkId;
    });
    return found;
  }

  /// Nodes are connected to Telemetry, but not necessarily candidates.
  async allNodes(): Promise<any[]> {
    return new Promise((resolve: any, reject: any) => {
    this._db.find({ networkId: /.*/ }).toArray((err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  /// Candidates are ones who can be nominated. 
  async allCandidates(): Promise<any[]> {
    return new Promise((resolve: any, reject: any) => {
      this._db.find({ stash: /.*/ }).toArray((err: any, docs: any) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  async getValidator(stash: Stash) {
    return this._queryOne({ stash });
  }

  async setValidator(stash: Stash, data: object) {
    if (!(await this._queryOne({ stash }))) {
      logger.info(`Could not find validator ${stash}`);
      return this._insert({ data });
    }
    return this._update({ stash }, data);
  }

  async allValidators() {
    return null;
  }

  async getNominator(address: string): Promise<any> {
    const nominators = await this.allNominators();
    const found = nominators.find((nominator: any) => {
      return nominator.nominator === address;
    });
    return found;
  }

  async allNominators(): Promise<any[]> {
    return new Promise((resolve: any, reject: any) => {
    this._db.find({ nominator: /.*/ }).toArray((err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  async clearAccumulations(): Promise<boolean> {
    const nodes = await this.allNodes();
    for (const node of nodes) {
      const newData = Object.assign(node, {
        offlineAccumulated: 0,
      });
      this._update({ id: node.id }, newData);
    }
    return true;
  }

  async clearCandidates(): Promise<boolean> {
    const candidates = await this.allCandidates();
    logger.info(`candidates length: ${candidates.length}`);
    if (!candidates.length) {
      logger.info('(DB::clearCandidates) No candidates to clear.')
      return;
    }
    for (const node of candidates) {
      const newData = Object.assign(node, {
        stash: null
      });
      logger.info(`\nIn clearCandidates mem usage ${JSON.stringify(process.memoryUsage())}`);
      await this._update({ name: node.name }, newData);
    }
    return true;
  }

  /**
   * PRIVATE METHODS
   */

  /// Insert new item in the datastore.
  private _insert(item: object): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._db.insertOne(item, (err: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /// Update an item in the datastore.
  private _update(item: object, data: any): Promise<boolean> {
    // To satisfy mongo.
    if (data._id) delete data._id;

    return new Promise((resolve, reject) => {
      this._db.updateOne(item, { $set: data }, (err: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /// Get an item from the datastore.
  private _queryOne(item: object): Promise<any> {
    return new Promise((resolve, reject) => {
      this._db.find(item).toArray((err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs[0]);
      });
    });
  }
}
