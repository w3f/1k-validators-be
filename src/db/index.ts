import mongoose from "mongoose";

import { CandidateSchema, NominatorSchema } from "./models";
import logger from "../logger";
import { add } from "winston";

export default class Db {
  private candidateModel: any;
  private nominatorModel: any;

  constructor(connection: any) {
    this.candidateModel = mongoose.model("Candidate", CandidateSchema);
    this.nominatorModel = mongoose.model("Nominator", NominatorSchema);
  }

  static async create(uri = "mongodb://localhost:27017/otv"): Promise<Db> {
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection issue: ${err}`);
    });

    return new Promise((resolve) => {
      mongoose.connection.once("open", () => {
        logger.info(`Established a connection to MongoDB.`);
        resolve(new Db(mongoose.connection));
      });
    });
  }

  // Adds a new candidate from the configuration file data.
  async addCandidate(
    name: string,
    stash: string,
    sentryId: string
  ): Promise<boolean> {
    logger.info(
      `(Db::addCandidate) name: ${name} stash: ${stash} sentryId: ${sentryId}`
    );

    // Check to see if the candidate has already been added as a node.
    const data = await this.candidateModel.findOne({ name });
    if (!data) {
      logger.info(
        `(Db::addCandidate) Did not find candidate data for ${name} - inserting new document.`
      );

      const candidate = new this.candidateModel({
        name,
        stash,
        sentryId,
      });
      return candidate.save();
    }

    // If already has the node data by name, just store the candidate specific
    // stuff.
    return this.candidateModel.updateOne(
      {
        name,
      },
      {
        stash,
        sentryId,
      }
    );
  }

  // Reports a node online that has joined telemetry.
  async reportOnline(
    telemetryId: number,
    details: any[],
    now: number
  ): Promise<boolean> {
    const [name, , , , networkId] = details;

    logger.info(
      `(Db::reportOnline) Reporting ${name} with network ID ${networkId} ONLINE.`
    );

    const data = await this.candidateModel.findOne({ name });
    if (!data) {
      // A new node that is not already registered as a candidate.
      const candidate = new this.candidateModel({
        telemetryId,
        networkId,
        name,
        discoveredAt: now,
        onlineSince: now,
      });
      return candidate.save();
    }

    if (!data.networkId) {
      // A candidate that haven't had their node registered on the network yet.
      return this.candidateModel.updateOne(
        {
          name,
        },
        {
          telemetryId,
          networkId,
          discoveredAt: now,
          onlineSince: now,
        }
      );
    }

    if (data.offlineSince && data.offlineSince !== 0) {
      // The node was previously offline.
      const timeOffline = now - data.offlineSince;
      const accumulated = data.offlineAccumulated + timeOffline;

      if (data.networkId !== networkId) {
        // It changed its network id too.
        await this.candidateModel.updateOne(
          {
            name,
          },
          {
            telemetryId,
            networkId,
          }
        );
      }

      return this.candidateModel.updateOne(
        {
          name,
        },
        {
          offlineSince: 0,
          offlineAccumulated: accumulated,
          onlineSince: now,
        }
      );
    }
  }

  /**
   * The reportOffline function does no verification, so its anticipated that
   * whatever is calling it has already verified the node is indeed offline.
   * @param telemetryId The inerited ID from telemetry for this node.
   * @param name The name of the node.
   * @param now The timestamp for now (in ms).
   */
  async reportOffline(
    telemetryId: number,
    name: string,
    now: number
  ): Promise<boolean> {
    logger.info(
      `(Db::reportOffline) Reporting ${name} with telemetry id ${telemetryId} offline at ${now}.`
    );

    const data = await this.candidateModel.findOne({ name });

    if (!data) {
      logger.info(`(Db::reportOffline) No data for node named ${name}.`);
      return false;
    }

    return this.candidateModel.updateOne(
      {
        name,
      },
      {
        offlineSince: now,
        onlineSince: 0,
      }
    );
  }

  reportSentryOnline(name: string, now: number): Promise<boolean> {}

  reportSentryOffline(name: string, now: number): Promise<boolean> {}

  reportUpdated(name: string,. now: number): Promise<boolean> {

  }

  reportNotUpdated(name: string): Promise<boolean> {

  }

  /** Nominator accessor functions */
  async addNominator(address: string, now: number): Promise<boolean> {
    logger.info(`(Db::addNominator) Adding ${address} at ${now}.`);

    const data = await this.nominatorModel.findOne({ address });
    if (!data) {
      const nominator = new this.nominatorModel({
        address,
        current: [],
        lastNomination: 0,
        createdAt: now,
      });
      return nominator.save();
    }

    return this.nominatorModel.updateOne(
      {
        address,
      },
      {
        createdAt: now,
      },
    );
  }

  async setTarget(address: string, target: string, now: number): Promise<boolean> {
    logger.info(`(Db::setTarget) Setting ${address} with new target ${target}.`);

    const data = await this.nominatorModel.findOne({ address });
    return this.nominatorModel.updateOne(
      {
        address,
      },
      {
        current: data.current.push(target),
      },
    );
  }
}
