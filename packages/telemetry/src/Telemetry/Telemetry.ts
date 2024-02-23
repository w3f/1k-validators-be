import { logger } from "@1kv/common";

export type metadata = {
  x: string;
};

export abstract class Telemetry {
  constructor(protected readonly metadata: metadata) {}

  abstract _startSpecificJobs(): Promise<void>;

  public startJobs = async (): Promise<void> => {
    const { x } = this.metadata;

    try {
      await this._startSpecificJobs();
    } catch (e) {
      logger.error(e.toString());
    }
  };
}
