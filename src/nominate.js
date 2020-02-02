const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

class Nominator {
  constructor(cfg, storage, logger) {
    this.cfg = cfg;
    this.storage = storage;
    this.logger = logger;
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

    if (lastNominated + this.cfg.nominate.nominationPeriod > now) {
      this.logger.debug(`Skipping nominations | Last nominated at ${lastNominated} | Current time: ${now}`);
      return;
    }

    await this.storage.updateLastNominated(this.address);

    const nodes = await this.storage.getNodes();
    // Sort by connection time.
    nodes.sort((a, b) => {
      return a.connectedAt - b.connectedAt;
    });
    // Then sort by whoever was nominated earliest in the past.
    // By default, nodes will start with this set to 0.
    nodes.sort((a, b) => {
      return a.nominatedAt - b.nominatedAt;
    });

    const toNominate = nodes.splice(0, this.maxNominations);
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
        unsub();
      }
    });
  }

  shutdown() {
    this.logger.info(`Shutting down ${this.address}`);
    clearInterval(this.interval);
  }
}

module.exports = Nominator;
