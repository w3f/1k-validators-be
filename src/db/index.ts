import mongoose from "mongoose";

import { CandidateSchema, NominatorSchema } from "./models";
import logger from "../logger";

import { getRawPeerId } from "../util";

// Sets a global configuration to silence mongoose deprecation warnings.
mongoose.set("useFindAndModify", false);

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

    return new Promise((resolve, reject) => {
      mongoose.connection.once("open", () => {
        logger.info(`Established a connection to MongoDB.`);
        resolve(new Db(mongoose.connection));
      });

      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection issue: ${err}`);
        reject(err);
      });
    });
  }

  // Adds a new candidate from the configuration file data.
  async addCandidate(name: string, stash: string): Promise<boolean> {
    logger.info(`(Db::addCandidate) name: ${name} stash: ${stash}`);

    // Check to see if the candidate has already been added as a node.
    const data = await this.candidateModel.findOne({ name });
    if (!data) {
      logger.info(
        `(Db::addCandidate) Did not find candidate data for ${name} - inserting new document.`
      );

      const candidate = new this.candidateModel({
        name,
        stash,
      });
      return candidate.save();
    }

    // If already has the node data by name, just store the candidate specific
    // stuff.
    return this.candidateModel.findOneAndUpdate(
      {
        name,
      },
      {
        stash,
      }
    );
  }

  // Reports a node online that has joined telemetry.
  async reportOnline(
    telemetryId: number,
    details: any[],
    now: number
  ): Promise<boolean> {
    const [name, , version, , networkId] = details;

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
        version,
        discoveredAt: now,
        onlineSince: now,
      });
      return candidate.save();
    }

    if (!data.networkId) {
      // A candidate that haven't had their node registered on the network yet.
      return this.candidateModel
        .findOneAndUpdate(
          {
            name,
          },
          {
            telemetryId,
            networkId,
            version,
            discoveredAt: data.discoveredAt || now,
            onlineSince: now,
          }
        )
        .exec();
    }

    if (data.version !== version) {
      await this.candidateModel
        .findOneAndUpdate(
          {
            name,
          },
          {
            version,
          }
        )
        .exec();
    }

    if (data.offlineSince && data.offlineSince !== 0) {
      logger.debug(`Offline since: ${data.offlineSince}`);
      // The node was previously offline.
      const timeOffline = now - data.offlineSince;
      const accumulated = (data.offlineAccumulated || 0) + timeOffline;

      if (data.networkId !== networkId) {
        // It changed its network id too.
        await this.candidateModel
          .findOneAndUpdate(
            {
              name,
            },
            {
              telemetryId,
              networkId,
            }
          )
          .exec();
      }

      return this.candidateModel
        .findOneAndUpdate(
          {
            name,
          },
          {
            offlineSince: 0,
            offlineAccumulated: accumulated,
            onlineSince: now,
          }
        )
        .exec();
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

    return this.candidateModel.findOneAndUpdate(
      {
        name,
      },
      {
        offlineSince: now,
        onlineSince: 0,
      }
    );
  }

  async reportUpdated(name: string, now: number): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate(
        {
          name,
        },
        {
          updated: true,
        }
      )
      .exec();
    return true;
  }

  async reportNotUpdated(name: string): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate(
        {
          name,
        },
        {
          updated: false,
        }
      )
      .exec();
    return true;
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

    return this.nominatorModel.findOneAndUpdate(
      {
        address,
      },
      {
        createdAt: now,
      }
    );
  }

  async setTarget(
    address: string,
    target: string,
    now: number
  ): Promise<boolean> {
    logger.info(
      `(Db::setTarget) Setting ${address} with new target ${target}.`
    );

    await this.candidateModel
      .findOneAndUpdate(
        {
          stash: target,
        },
        {
          nominatedAt: now,
        }
      )
      .exec();

    await this.nominatorModel
      .findOneAndUpdate(
        {
          address,
        },
        {
          $push: { current: target },
        }
      )
      .exec();

    return true;
  }

  async clearCurrent(address: string, now: number): Promise<boolean> {
    logger.info(`(Db::clearCurrent) Clearing current for ${address}.`);

    await this.nominatorModel
      .findOneAndUpdate(
        {
          address,
        },
        {
          current: [],
        }
      )
      .exec();

    return true;
  }

  async setLastNomination(address: string, now: number): Promise<boolean> {
    logger.info(
      `(Db::setLastNomination) Setting ${address} last nomination to ${now}.`
    );

    return this.nominatorModel
      .findOneAndUpdate(
        {
          address,
        },
        {
          $set: { lastNomination: now },
        }
      )
      .exec();
  }

  async getCurrentTargets(address: string): Promise<string[]> {
    return (await this.nominatorModel.findOne({ address })).current;
  }

  /** Adding and removing points */

  async addPoint(stash: string): Promise<boolean> {
    logger.info(`Adding a point to ${stash}.`);

    const data = await this.candidateModel.findOne({ stash });
    await this.candidateModel
      .findOneAndUpdate(
        {
          stash,
        },
        {
          rank: data.rank + 1,
        }
      )
      .exec();

    return true;
  }

  async dockPoints(stash: string): Promise<boolean> {
    logger.info(`Docking points for ${stash}.`);

    const data = await this.candidateModel.findOne({ stash });
    await this.candidateModel
      .findOneAndUpdate(
        {
          stash,
        },
        {
          rank: Math.floor(data.rank / 2),
          faults: data.faults + 1,
        }
      )
      .exec();

    return true;
  }

  /** Storage GETTERS and SETTERS */

  async clearAccumulated(): Promise<boolean> {
    logger.info(`(Db::clearAccumulated) Clearing offline accumulated time.`);

    const candidates = await this.allCandidates();
    if (!candidates.length) {
      // nothing to do
      return true;
    }

    for (const candidate of candidates) {
      const { name, offlineAccumulated } = candidate;
      if (offlineAccumulated > 0) {
        await this.candidateModel.findOneAndUpdate(
          {
            name,
          },
          {
            offlineAccumulated: 0,
          }
        );
      }
    }
    return true;
  }

  async clearCandidates(): Promise<boolean> {
    logger.info(`(Db::clearCandidates) Clearing stale candidate data.`);

    const candidates = await this.allCandidates();
    if (!candidates.length) {
      // nothing to do
      return true;
    }

    for (const candidate of candidates) {
      const { name } = candidate;
      await this.candidateModel
        .findOneAndUpdate(
          {
            name,
          },
          {
            stash: null,
          }
        )
        .exec();
    }

    return true;
  }

  async allCandidates(): Promise<any[]> {
    return this.candidateModel.find({ stash: /.*/ }).exec();
  }

  async allNodes(): Promise<any[]> {
    return this.candidateModel.find({ networkId: /.*/ }).exec();
  }

  async allNominators(): Promise<any[]> {
    return this.nominatorModel.find({ address: /.*/ }).exec();
  }

  async getCandidate(stash: string): Promise<any> {
    return this.candidateModel.findOne({ stash }).exec();
  }
}
