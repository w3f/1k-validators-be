import Server from "./server";
import { Command } from "commander";
import { Config, Db, logger } from "@1kv/common";
import path from "path";

const version = "v2.6.87";

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    console.error(e.toString());
    process.exit(1);
  }
};

export const gatewayLabel = { label: "Gateway" };

const start = async (cmd: { config: string }) => {
  const config = Config.loadConfig(path.join(cmd.config, "main.json"));

  logger.info(`starting the backend services. ${version}`, gatewayLabel);
  const db = await Db.create(config.db.mongo.uri);
  const server = new Server(config);
  server.start();
};

const program = new Command();

if (require.main === module) {
  program
    .option(
      "--config <directory>",
      "The path to the config directory.",
      "config",
    )
    .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

  program.version(version);
  program.parse(process.argv);
}
