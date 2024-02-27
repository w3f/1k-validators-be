import * as winston from "winston";
import { defaultExcludeLabels } from "./constants";

const filters = defaultExcludeLabels;

const logFilter = (labelsToExclude: string[]) => {
  return winston.format((info) => {
    if (labelsToExclude.includes(info.label)) {
      return false; // Exclude log messages with labels in the exclusion list
    }
    return info;
  });
};

export const logger = winston.createLogger({
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
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize()),
    }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Creates a logger with the given filters - any labels in the filters are excluded from logging
export const createLogger = (filters: string[]) => {
  const logger = winston.createLogger({
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
  return logger;
};

export default logger;
