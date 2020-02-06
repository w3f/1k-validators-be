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

	async updateNode(nodeId, nodeDetails, connectedAt, nominatedAt, rank = 0) {
		const newData = {
			id: nodeId,
			nodeDetails,
			connectedAt,
			nominatedAt,
			rank,
		};

		if (await this.hasNode(nodeId)) {
			newData.rank = (await this.getNode(nodeId)).rank;
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
