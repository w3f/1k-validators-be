import * as winston from "winston";
import { defaultExcludeLabels } from "./constants";

const filters = defaultExcludeLabels;

const logFilter = (labelsToExclude: string[]) => {
  return winston.format((info) => {
    if (labelsToExclude.includes(info.label)) {
      return false;
    }
    return info;
  });
};

const getLogLevel = () => {
  return process.env.NODE_ENV === "test" ? "warn" : "info";
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
    // level: getLogLevel(),
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
