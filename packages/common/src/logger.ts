import * as winston from "winston";
import { defaultExcludeLabels } from "./constants";
import { ConfigSchema } from "./config";
import * as fs from "fs";
import path from "path";

const logFilter = (labelsToExclude: string[]) => {
  return winston.format((info) => {
    if (labelsToExclude.includes(info.label)) {
      return false;
    }
    return info;
  });
};

const loadConfig = (configPath: string): ConfigSchema => {
  let conf = fs.readFileSync(configPath, { encoding: "utf-8" });
  if (conf.startsWith("'")) {
    conf = conf.slice(1).slice(0, -1);
  }
  return JSON.parse(conf);
};

const loadLoggerConfig = (): ConfigSchema["logger"] => {
  try {
    const configDir = "config";
    const mainPath = path.join(configDir, "main.json");
    const mainConf = loadConfig(mainPath);

    return mainConf.logger;
  } catch (e) {
    console.log(`Error loading config: ${JSON.stringify(e)}`);
    // logger.error(`Error loading config: ${JSON.stringify(e)}`);
  }
};

const filters = loadLoggerConfig()?.excludedLabels || defaultExcludeLabels;

const getLogLevel = () => {
  return loadLoggerConfig()?.level || process.env.LOG_LEVEL || "info";
};

const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    logFilter(filters)(),
    winston.format.printf(({ level, message, timestamp, label }) => {
      return `${level}: ${label ? `[${label}]` : ""} ${message}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

export default logger;

export const createLogger = (customFilters: string[]) => {
  const logger = winston.createLogger({
    level: getLogLevel(),
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.align(),
      logFilter([...filters, ...customFilters])(),
      winston.format.printf(({ level, message, timestamp, label }) => {
        return `${level}: ${label ? `[${label}]` : ""} ${message}`;
      }),
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: "combined.log" }),
    ],
  });
  return logger;
};
