import Server from "./server";
import { Command } from "commander";
import { Db, Config, logger } from "@1kv/common";

const version = "v2.6.87";

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

  logger.info(`{Gateway:Start} Starting the backend services. ${version}`);
  const db = await Db.create(config.db.mongo.uri);
  const server = new Server(config);
  server.start();
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);
