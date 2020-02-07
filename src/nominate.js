const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

const { WEEK } = require('./constants');

class Nominator {
  constructor(cfg, storage, logger) {
    this.cfg = cfg;
    this.storage = storage;
    this.logger = logger;
    this.candidates = {};

    cfg.nominate.candidates.forEach((candidate) => {
      this.candidates[candidate.name] = candidate.stash;
    });
  }

  static async create(cfg, storage, logger, nomCfg) {
    let nominator = new Nominator(cfg, storage, logger);
    const keyring = new Keyring({
      type: 'sr25519',
    });

    const api = await ApiPromise.create({
      provider: new WsProvider(cfg.nominate.wsEndpoint),
    });
    nominator.api = api;

    nominator.signer = keyring.createFromUri(nomCfg.seed);
    nominator.address = nominator.signer.address;

    const { maxNominations, maxAmount } = nomCfg;
    nominator.maxNominations = maxNominations;
    nominator.maxAmount = maxAmount;

    return nominator;
  }

  start() {
    this.logger.info(`${this.address} started as nominator`);
    this.interval = setInterval(() => this._tryNominate(), this.cfg.nominate.pollFrequency);
    this._tryNominate();
  }

  async _tryNominate() {
    // Check if it's time to nominate new validators.
    const now = new Date().getTime();
    const lastNominated = await this.storage.lastNominatedAt(this.address);

    const nextNominationAt = Number(lastNominated) + Number(this.cfg.nominate.nominationPeriod);

    if (nextNominationAt > now) {
      this.logger.debug(`Skipping nominations | Last nominated at ${lastNominated} | Current time: ${now} | Will nominate at ${nextNominationAt}`);
      return;
    }

    await this.storage.updateLastNominated(this.address);

    const nodes = await this.storage.getNodes();
    // Remove any offline ones.
    nodes.filter((node) => node.offlineSince === 0);
    // Ensure nodes have at least 98% uptime (for one week that's 3.35 hours down).
    nodes.filter((node) => node.offlineAccumulated / WEEK <= 0.02);
    // Sort by connection time.
    nodes.sort((a, b) => {
      return a.connectedAt - b.connectedAt;
    });
    // Then sort by whoever was nominated earliest in the past.
    // By default, nodes will start with this set to 0.
    nodes.sort((a, b) => {
      return a.nominatedAt - b.nominatedAt;
    });

    const candidates = nodes.map((node) => this.candidates[node.nodeDetails[0]]);
    /// Ensure they have 10% or less commission set.
    /// Ensure they have over 50 KSM.
    const filteredCandidates = candidates.filter(async (candidate) => {
      const prefs = await this.api.query.staking.validators(candidate);
      const { commission } = prefs.toJSON()[0];
      const exposure = await this.api.query.staking.stakers(candidate);
      const ownStake = exposure.toJSON().own;
      return Number(commission) <= 10000000 && ownStake >= 50*10**12 ;
    });

    this.logger.debug(`Filtered candidates: ${filteredCandidates}`);
    const toNominate = filteredCandidates.splice(0, this.maxNominations);
    const tx = this.api.tx.staking.nominate(toNominate);
    this.logger.info(
      `Sending extrinsic Staking::nominate from ${this.address} to nominate ${toNominate}`
    );
    const unsub = await tx.signAndSend(this.signer, (result) => {
      const { status } = result;

      this.logger.debug(`Status now: ${status.type}`);
      if (status.isFinalized) {
        this.logger.info(
          `Extrinsic included in block with hash ${status.asFinalized}`
        );
        toNominate.forEach((node) => {
          this.storage.updateNode(node.id, node.nodeDetails, node.connectedAt, now);
        });
        unsub();
      }
    });
  }

  async endRound() {
    // At the end of round it needs to settle the points.
    const priorNominatedSet = ''; //TODO
    for (const stash of priorNominatedSet) {
      // Check that the commission wasn't raised.
      const prefs = await this.api.query.staking.validators(stash);
      const { commission } = prefs.toJSON()[0];
      if (commission > 10000000) {
        return this.dockPoints(stash);
      }
      // Check that KSM wasn't removed.
      const exposure = await this.api.query.staking.stakers(stash);
      const ownStake = exposure.toJSON().own;
      if (ownStake < 50*10**12) {
        return this.dockPoints(stash);
      }
      // TODO check against a saved list of slashes.
      //then
      return this.addPoint(stash);
    }
  }

  shutdown() {
    this.logger.info(`Shutting down ${this.address}`);
    clearInterval(this.interval);
  }
}

module.exports = Nominator;
