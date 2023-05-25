import Worker from "./worker";
import { Command } from "commander";
import { Config, Db, logger } from "@1kv/common";

const version = process.env.npm_package_version;

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    logger.info("There was an error!");
    logger.error(e.toString());
    process.exit(1);
  }
};

const start = async (cmd: { config: string }) => {
  const config = await Config.loadConfigDir(cmd.config);

  logger.info(`Starting the backend services. ${version}`, { label: "Worker" });
  const db = await Db.create(config.db.mongo.uri);
  const worker = new Worker(config);
  await worker.startWorker();
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);

process
  .on("unhandledRejection", (reason, p) => {
    console.error(reason, "Unhandled Rejection at Promise", p);
  })
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });
