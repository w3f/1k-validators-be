import Datastore from 'nedb';

type Stash = string;

export default class Database {
  private _db: any;

  constructor(filename: string, autoload: boolean = true) {
    this._db = new Datastore({ filename, autoload });
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
    return null;
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
  private _queryOne(item: object): Promise<object> {
    return new Promise((resolve, reject) => {
      this._db.find(item, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs[0]);
      });
    });
  }
}
