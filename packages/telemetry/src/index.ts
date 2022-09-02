import { Db, Config, logger } from "@1kv/common";
import { Command } from "commander";

import TelemetryClient from './telemetry';

const version = "v3.0.0";

const catchAndQuit = async (fn: any) => {
    try {
        await fn;
    } catch (e) {
        console.error(e.toString());
        process.exit(1);
    }
};

const start = async (cmd: { config: string }) => {
    const config = Config.loadConfigDir(cmd.config);

    logger.info(`{Start} Starting the backend services. ${version}`);
    const db = await Db.create(config.db.mongo.uri);
    const telemetry = new TelemetryClient(config, db);
    await telemetry.start();
};

const program = new Command();

program
    .option("--config <directory>", "The path to the config directory.", "config")
    .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);
