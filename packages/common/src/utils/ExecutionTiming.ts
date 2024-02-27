import chalk from "chalk";
import logger from "../logger";

export const withExecutionTimeLogging = <T extends any[], R>(
  func: (...args: T) => Promise<R>,
  label: { label: string },
  text: string,
): ((...args: T) => Promise<R>) => {
  return async (...args: T): Promise<R> => {
    const start = Date.now();
    const result = await func(...args); // Execute the original function
    const end = Date.now();
    const executionTime = (end - start) / 1000;
    const coloredExecutionTime = chalk.bgGreen(`(${executionTime}s)`);
    logger.info(`${text} ${coloredExecutionTime}`, label);
    return result;
  };
};
