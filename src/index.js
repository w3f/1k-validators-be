const Koa = require('koa');

const Client = require('./client');
const Logger = require('./logger');
const Nominator = require('./nominate');
const Storage = require('./storage');

const app = new Koa();

const API = {
	GetNodes: '/nodes',
	GetNominators: '/nominators',
};

const setRoutes = (storage) => {
	app.use(async (ctx) => {
		switch (ctx.url.toLowerCase()) {
			case API.GetNodes:
				{
					const nodes = await storage.getNodes();
					ctx.body = nodes;
				}
				break;
			case API.GetNominators:
				{
					const nominators = await storage.getNominators();
					ctx.body = nominators;
				}
				break;
			default:
				ctx.body = 'Invalid endpoint!';
		}
	});
};

const start = async (cfg) => {
  const logger = new Logger(cfg.logLevel);
  
  logger.info(`Using storage file ${cfg.storageFile}`);
  const storage = new Storage(cfg.storageFile, logger);

  const client = new Client(cfg, storage, logger);
	client.start();
	
	let nominators = [];
	for (const nomCfg of cfg.nominate.nominators) {
		const nominator = await Nominator.create(cfg, storage, logger, nomCfg);
		setTimeout(() => nominator.start(), 3000);
		nominators.push(nominator);
	}

	setRoutes(storage);

	logger.info(`Server listening on port ${cfg.serverPort}`);
	app.listen(cfg.serverPort);

	process.on('SIGINT', async () => {
		logger.info('Shutting down...');
		await storage.close();
		for (const nominator of nominators) {
			nominator.shutdown();
		}
		process.exit(0);
	});
};

try {
	const config = require('../config.json');
	start(config);
} catch (err) {
	console.error(err);
	process.exit(1);
}
