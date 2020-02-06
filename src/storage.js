const Datastore = require('nedb');
const { SECOND } = require('./constants');
const CompactionTimeout = 10 * SECOND;

class Storage {
  constructor(filename, autoload = true) {
    this._db = new Datastore({ filename, autoload });
  }

  async close() {
    this._db.persistence.compactDatafile();

    return new Promise((resolve) => {
      this._db.on('compaction.done', () => {
        this._db.removeAllListeners('compaction.done');
        resolve();
      });

      setTimeout(() => {
        resolve();
      }, CompactionTimeout);
    });
  }

  async hasNode(nodeId) {
    const queryResult = await this._query({ id: nodeId });
    if (typeof queryResult !== 'undefined') {
      return true;
    }
    return false;
  }

  async reportOffline(nodeId) {
    const now = new Date().getTime();
    const oldData = (await this.getNode(nodeId))[0];
    // console.log(oldData);
    const newData = Object.assign(oldData, {
      offlineSince: now,
    });
    // console.log('NEW DATA', newData);
    try {
      await this._update({ id: nodeId }, newData);
    } catch (err) { console.error(err); }
    return true;
  }

  async reportOnline(nodeId) {
    const now = new Date().getTime();
    const oldData = (await this.getNode(nodeId))[0];
    const timeOffline = now - Number(oldData.offlineSince);
    console.log(timeOffline);
    const accu = oldData.offlineAccumulated ? Number(oldData.offlineAccumulated) : 0;
    const newData = Object.assign(oldData, {
      offlineSince: 0,
      offlineAccumulated: accu + timeOffline,
    });
    try {
      await this._update({ id: nodeId }, newData);
    } catch (err) {
      console.error(err);
    }
    return true;
  }

  async updateNode(nodeId, nodeDetails, connectedAt, nominatedAt, goodSince = 1, offlineSince = 0, rank = 0) {
    const newData = {
      id: nodeId,
      nodeDetails,
      connectedAt,
      nominatedAt,
      goodSince,
      offlineSince,
      rank,
    };

    if (await this.hasNode(nodeId)) {
      const { rank, offlineAccumulated } = (await this.getNode(nodeId))[0];
      newData.rank = rank;
      newData.offlineAccumulated = offlineAccumulated;
      console.log(newData);
      await this._update({ id: nodeId }, newData);
      return true;
    }

    await this._insert(newData);
    return true;
  }

  async removeNode(nodeId) {
    await this._remove({ id: nodeId });
    return true;
  }

  async getNodes() {
    return new Promise((resolve, reject) => {
      this._db.find({ id: { $gte: 0 } }, (err, docs) => {
        if (err) reject();
        resolve(docs);
      });
    });
  }

  async getNode(id) {
    return new Promise((resolve, reject) => {
      this._db.find({ id }, (err, docs) => {
        if (err) reject();
        resolve(docs);
      });
    });
  }

  async getNominators() {
    return new Promise((resolve, reject) => {
      this._db.find({ nominator: /.*/ }, (err, docs) => {
        if (err) reject();
        resolve(docs);
      });
    });
  }

  async updateLastNominated(nominator) {
    const now = new Date().getTime();
    const data = {
      nominator,
      lastNominated: now,
    };
    if (await this.hasNominator(nominator)) {
      await this._update({ nominator }, data);
      return true;
    }

    await this._insert(data);
    return true;
  }

  async hasNominator(nominator) {
    const queryResult = await this._query({ nominator });
    console.log(queryResult);
    if (typeof queryResult !== 'undefined') {
      return true;
    }
    return false;
  }

  async lastNominatedAt(nominator) {
    const data = await new Promise((resolve, reject) => {
      this._db.find({ nominator }, (err, docs) => {
        if (err) reject();
        resolve(docs[0]);
      });
    });

    if (data) return data.lastNominated;
    else return 0;
  }

  _insert(item) {
    return new Promise((resolve, reject) => {
      this._db.insert(item, err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  _update(item, data) {
    return new Promise((resolve, reject) => {
      this._db.update(item, data, err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  _remove(item) {
    return new Promise((resolve, reject) => {
      this._db.remove(item, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  _query(item) {
    return new Promise((resolve, reject) => {
      this._db.find(item, (err, docs) => {
        if (err) reject(err);
        resolve(docs[0]);
      });
    });
  }
}

module.exports = Storage;
