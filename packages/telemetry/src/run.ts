import { Config, Db, logger } from "@1kv/common";
import TelemetryClient from "./telemetry";
import { Command } from "commander";
import path from "path";
import { Server } from "@1kv/gateway";

const version = "v3.0.0";

export const telemetryLabel = { label: "Telemetry" };

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

export const createServer = async (config) => {
  try {
    logger.info(`Creating Server`, telemetryLabel);
    const server = new Server(config);
    await server.start();
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};
const start = async (cmd: { config: string }) => {
  const config = Config.loadConfig(path.join(cmd.config, "main.json"));
  await createServer(config);

  logger.info(`Starting the backend services: ${version}`, telemetryLabel);

  const db = await Db.create(config.db.mongo.uri);
  const telemetry = new TelemetryClient(config);
  await telemetry.start();
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);
