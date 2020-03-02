import Datastore from 'nedb';

type Address = string;
type Stash = string;

export default class Database {
  private _db: any;

  constructor(filename: string, autoload: boolean = true) {
    this._db = new Datastore({ filename, autoload });
  }

  /// Entry point for adding a new candidate.
  async addCandidate(name: string, stash: string) {
    console.log(`Adding candidate ${name}`);

    const oldData = await this._queryOne({ name });
    if (!oldData) {
      console.log(`Could not find candidate node ${name} - skipping`);
      return;
    }
    const newData = Object.assign(oldData, {
      stash,
    });
    return this._update({ name }, newData);
  }

  async addNominator(address: Address): Promise<boolean> {
    console.log(`Adding nominator ${address}`);
    const now = new Date().getTime();

    const oldData = await this._queryOne({ nominator: address });
    if (!oldData) {
      console.log(`${address} seen for the first time`);
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

  async newTargets(address: Address, targets: Stash[]): Promise<boolean> {
    console.log(`Adding new targets for ${address}`);
    const now = new Date().getTime();

    const oldData = await this._queryOne({ nominator: address });
    const newData = Object.assign(oldData, {
      current: targets,
      nominatedAt: now,
      lastSeen: now,
    });

    return this._update({ nominator: address }, newData);
  }

  async getCurrentTargets(address: Address): Promise<Stash[]> {
    console.log(`DB::getCurrentTargets for ${address}`);
    
    //@ts-ignore
    return (await this._queryOne({ nominator: address })).current;
  }

  async setNominatedAt(stash: Stash, now: number) {
    console.log('setting nominated at', now);

    const oldData = await this._queryOne({ stash });
    const newData = Object.assign(oldData, {
      nominatedAt: now,
    });
    return this._update({ stash }, newData);
  }

  async setTarget(nominator: Address, stash: Stash, now: number) {
    console.log('setting target');

    const oldData = await this._queryOne({ nominator });
    const newData = Object.assign(oldData, {
      current: oldData.current.push(stash),
      nominatedAt: now,
      lastSeen: now,
    });

    return this._update({ nominator }, newData);
  }

  /// Entry point for reporting a new node is online.
  async reportOnline(id: number, details: Array<any>) {

    const name = details[0];

    //@ts-ignore
    console.log(`Reporting ${name} online.`)

    const now = new Date().getTime();
    const oldData = await this._queryOne({ id });

    if (!oldData) {
      /// First time we're seeing the node.
      const data = {
        id,
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
      };
      return this._insert(data); 
    } else {
      /// We've seen the node before, take stock of any offline time.
      const timeOffline = now - Number(oldData.offlineSince);
      const accumulated = Number(oldData.offlineAccumulated) + timeOffline;
      const newData = Object.assign(oldData, {
        offlineSince: 0,
        offlineAccumulated: accumulated,
      });
      return this._update({ id }, newData);
    }
  }

  async reportOffline(id: number) {
    const now = new Date().getTime();
    const oldData = await this._queryOne({ id });
    const newData = Object.assign(oldData, {
      offlineSince: now,
    });

    return this._update({ id }, newData);
  }

  async nodeGood(id: number, now: number) {
    const oldData = await this._queryOne({ id });
    const newData = Object.assign(oldData, {
      goodSince: now,
    });

    return this._update({ id }, newData);
  }

  async nodeNotGood(id: number) {
    const oldData = await this._queryOne({ id });
    const newData = Object.assign(oldData, {
      goodSince: 0,
    });

    return this._update({ id }, newData);
  }

  async allNodes(): Promise<any[]> {
    return new Promise((resolve: any, reject: any) => {
      this._db.find({ id: { $gte: 0 } }, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  async getValidator(stash: Stash) {
    return this._queryOne({ stash });
  }

  async setValidator(stash: Stash, data: object) {
    if (!(await this._queryOne({ stash }))) {
      return this._insert({ data });
    }
    return this._update({ stash }, data);
  }

  async allValidators() {
    return null;
  }

  async allNominators() {
    return new Promise((resolve: any, reject: any) => {
    this._db.find({ nominator: /.*/ }, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  /// Insert new item in the datastore.
  private _insert(item: object): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._db.insert(item, (err: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /// Update an item in the datastore.
  private _update(item: object, data: object): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._db.update(item, data, (err: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /// Get an item from the datastore.
  private _queryOne(item: object): Promise<any> {
    return new Promise((resolve, reject) => {
      this._db.find(item, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs[0]);
      });
    });
  }
}
