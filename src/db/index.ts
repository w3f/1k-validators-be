import mongoose from "mongoose";

import {
  AccountingSchema,
  CandidateSchema,
  DelayedTxSchema,
  EraSchema,
  NominatorSchema,
  NominationSchema,
  ChainMetadataSchema,
  BotClaimEventSchema,
  EraPointsSchema,
  TotalEraPointsSchema,
  EraStatsSchema,
} from "./models";
import logger from "../logger";
import { formatAddress } from "../util";
import { Keyring } from "@polkadot/keyring";

// [name, client, version, null, networkId]
export type NodeDetails = [string, string, string, string, string];

// Sets a global configuration to silence mongoose deprecation warnings.
(mongoose as any).set("useFindAndModify", false);

export default class Db {
  private accountingModel;
  private candidateModel;
  private delayedTxModel;
  private eraModel;
  private eraPointsModel;
  private totalEraPointsModel;
  private nominatorModel;
  private nominationModel;
  private chainMetadataModel;
  private botClaimEventModel;
  private eraStatsModel;

  constructor() {
    this.accountingModel = mongoose.model("Accounting", AccountingSchema);
    this.candidateModel = mongoose.model("Candidate", CandidateSchema);
    this.delayedTxModel = mongoose.model("DelayedTx", DelayedTxSchema);
    this.eraModel = mongoose.model("Era", EraSchema);
    this.eraPointsModel = mongoose.model("EraPoints", EraPointsSchema);
    this.totalEraPointsModel = mongoose.model(
      "TotalEraPoints",
      TotalEraPointsSchema
    );
    this.nominatorModel = mongoose.model("Nominator", NominatorSchema);
    this.nominationModel = mongoose.model("Nomination", NominationSchema);
    this.chainMetadataModel = mongoose.model(
      "ChainMetadata",
      ChainMetadataSchema
    );
    this.botClaimEventModel = mongoose.model(
      "BotClaimEvent",
      BotClaimEventSchema
    );
    this.eraStatsModel = mongoose.model("EraStatsModel", EraStatsSchema);
  }

  static async create(uri = "mongodb://localhost:27017/otv"): Promise<Db> {
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    return new Promise((resolve, reject) => {
      mongoose.connection.once("open", async () => {
        logger.info(`Established a connection to MongoDB.`);
        const db = new Db();
        // Initialize lastNominatedEraIndex if it's not already set.
        if (!(await db.getLastNominatedEraIndex())) {
          await db.setLastNominatedEraIndex(0);
        }
        resolve(db);
      });

      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection issue: ${err}`);
        reject(err);
      });
    });
  }

  async addDelayedTx(
    number: number,
    controller: string,
    targets: string[],
    callHash: string
  ): Promise<boolean> {
    const delayedTx = new this.delayedTxModel({
      number,
      controller,
      targets,
      callHash,
    });

    return delayedTx.save();
  }

  async getAllDelayedTxs(): Promise<any[]> {
    return this.delayedTxModel.find({ controller: /.*/ }).exec();
  }

  async deleteDelayedTx(number: number, controller: string): Promise<boolean> {
    return this.delayedTxModel.deleteOne({ number, controller }).exec();
  }

  // Adds a new candidate from the configuration file data.
  async addCandidate(
    name: string,
    stash: string,
    kusamaStash: string,
    skipSelfStake: boolean,
    bio: string,
    bot?: any
  ): Promise<boolean> {
    const network = (await this.getChainMetadata()).name;
    const keyring = new Keyring();
    const ss58Prefix = network == "Kusama" ? 2 : 0;
    stash = keyring.encodeAddress(stash, ss58Prefix);
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
        kusamaStash,
        skipSelfStake,
        bio,
      });

      if (!!bot) {
        await bot.sendMessage(`Adding new candidate: ${name} (${stash})`);
      }

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
        kusamaStash,
        skipSelfStake,
        bio,
      }
    );
  }

  // Unsets old candidate fields.
  async deleteOldCandidateFields(): Promise<boolean> {
    await this.candidateModel.collection.update(
      {},
      {
        $unset: {
          sentryId: 1,
          sentryOnlineSince: 1,
          sentryOfflineSince: 1,
        },
      },
      { multi: true, safe: true }
    );

    return true;
  }

  async deleteOldFieldFrom(name: string): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate(
        { name },
        {
          $unset: {
            sentryId: 1,
            sentryOnlineSince: 1,
            sentryOfflineSince: 1,
          },
        }
      )
      .exec();

    return true;
  }

  async clearNodeRefsFrom(name: string): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate({ name }, { nodeRefs: 0 })
      .exec();

    return true;
  }

  /**
   * Removes any stale nominator data from the database.
   * @param controllers Active controller accounts for nominators.
   */
  async removeStaleNominators(controllers: string[]): Promise<boolean> {
    const nominators = await this.allNominators();
    const addresses = nominators.map((n) => n.address);
    // for each address
    for (const address of addresses) {
      // if it's not found in the active controllers
      if (controllers.indexOf(address) === -1) {
        // remove the stale item from the DB
        await this.nominatorModel.deleteOne({ address }).exec();
      }
    }

    return true;
  }

  // Sets an invalidityReason for a candidate.
  async setInvalidityReason(stash: string, reason: string): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate(
        { stash },
        {
          invalidityReasons: reason,
        }
      )
      .exec();

    return true;
  }

  async setLastValid(stash: string): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate({ stash }, { lastValid: Date.now() })
      .exec();
    return true;
  }

  async setCommission(stash: string, commission: number): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate({ stash }, { commission: commission })
      .exec();
    return true;
  }

  async setController(stash: string, controller: string): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate({ stash }, { controller: controller })
      .exec();
    return true;
  }

  async setIdentity(
    stash: string,
    identity: { name: string; sub: string; verified: boolean }
  ): Promise<boolean> {
    await this.candidateModel
      .findOneAndUpdate({ stash }, { identity: identity })
      .exec();
    return true;
  }

  // Reports a node online that has joined telemetry.
  async reportOnline(
    telemetryId: number,
    details: NodeDetails,
    now: number
  ): Promise<boolean> {
    const [name, , version] = details;
    logger.info(JSON.stringify(details));

    logger.info(`(Db::reportOnline) Reporting ${name} ONLINE.`);

    const data = await this.candidateModel.findOne({ name });
    if (!data) {
      // A new node that is not already registered as a candidate.
      const candidate = new this.candidateModel({
        telemetryId,
        networkId: null,
        nodeRefs: 1,
        name,
        version,
        discoveredAt: now,
        onlineSince: now,
        offlineSince: 0,
      });

      return candidate.save();
    }

    if (!data.discoveredAt) {
      await this.candidateModel
        .findOneAndUpdate(
          { name },
          {
            discoveredAt: now,
            onlineSince: now,
            offlineSince: 0,
          }
        )
        .exec();
    }

    // Always
    //  - Update the version
    //  - Update the node refs
    //  - Update that the node is online
    await this.candidateModel
      .findOneAndUpdate(
        { name },
        { onlineSince: now, version, $inc: { nodeRefs: 1 } }
      )
      .exec();

    if (data.offlineSince && data.offlineSince !== 0) {
      logger.debug(`Offline since: ${data.offlineSince}`);
      // The node was previously offline.
      const timeOffline = now - data.offlineSince;
      const accumulated = (data.offlineAccumulated || 0) + timeOffline;

      return this.candidateModel
        .findOneAndUpdate(
          {
            name,
          },
          {
            offlineSince: 0,
            offlineAccumulated: accumulated,
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

    // If more than one node has this name, we assume the validator is updating.
    // Only decrement the nodeRefs, don't mark offline.
    if (data.nodeRefs > 1) {
      return this.candidateModel.findOneAndUpdate(
        { name },
        {
          $inc: {
            nodeRefs: -1,
          },
        }
      );
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

  async reportUpdated(name: string): Promise<boolean> {
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

  async pushRankEvent(
    stash: string,
    startEra: number,
    activeEra: number
  ): Promise<boolean> {
    const record = await this.candidateModel.findOne({ stash });
    if (!record) {
      return false;
    }

    let alreadyRank = false;
    for (const rank of record.rankEvents) {
      if (rank.startEra == startEra) {
        alreadyRank = true;
      }
    }

    if (alreadyRank) return false;

    await this.candidateModel.findOneAndUpdate(
      {
        stash,
      },
      {
        $push: {
          rankEvents: {
            when: Date.now(),
            startEra,
            activeEra,
          },
        },
      }
    );
    return true;
  }

  async pushFaultEvent(stash: string, reason: string): Promise<boolean> {
    logger.info(
      `(Db::pushFault) Adding new fault for ${stash} for reason ${reason}`
    );

    const record = await this.candidateModel.findOne({ stash });
    if (!record) {
      return false;
    }

    let alreadyFault = false;
    for (const fault of record.faultEvents) {
      if (fault.reason == reason) {
        alreadyFault = true;
      }
    }
    if (alreadyFault) return false;

    await this.candidateModel.findOneAndUpdate(
      {
        stash,
      },
      {
        $push: {
          faultEvents: {
            when: Date.now(),
            reason: reason,
            prevRank: record.rank,
          },
        },
      }
    );
    return true;
  }

  /**
   * Creates a new accounting record if none exists.
   * @param stash
   * @param controller
   */
  async newAccountingRecord(
    stash: string,
    controller: string
  ): Promise<boolean> {
    logger.info(
      `(Db::newAccountingRecord) Adding stash ${stash} and controller ${controller}`
    );

    const record = await this.accountingModel.findOne({ stash, controller });
    if (!record) {
      const accounting = new this.accountingModel({
        stash,
        controller,
        total: "0",
        records: [],
      });

      return accounting.save();
    }

    return true;
  }

  async updateAccountingRecord(
    controller: string,
    stash: string,
    era: string,
    reward: string
  ): Promise<boolean> {
    logger.info(
      `(Db::updateAccountingRecord) Adding era ${era} and reward ${reward}`
    );

    const record = await this.accountingModel.findOne({ stash, controller });
    if (!record) {
      // record doesn't exist just return false
      return false;
    }

    await this.accountingModel
      .findOneAndUpdate(
        {
          stash,
          controller,
        },
        {
          $push: { records: { era, reward } },
        }
      )
      .exec();

    return true;
  }

  async getAccounting(controllerOrStash: string): Promise<any> {
    const stashResult = await this.accountingModel
      .findOne({
        stash: controllerOrStash,
      })
      .exec();

    if (stashResult) {
      return stashResult;
    }

    const controllerResult = await this.accountingModel
      .findOne({
        controller: controllerOrStash,
      })
      .exec();

    if (controllerResult) {
      return controllerResult;
    }

    return null;
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

  async clearCurrent(address: string): Promise<boolean> {
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

  async setUnclaimedEras(
    stash: string,
    unclaimedEras: number[]
  ): Promise<boolean> {
    logger.info(
      `(Db::setUnclaimedEras) Setting unclaimed eras for ${stash} to the following validators: ${unclaimedEras}`
    );
    await this.candidateModel
      .findOneAndUpdate(
        {
          stash,
        },
        {
          unclaimedEras: unclaimedEras,
        }
      )
      .exec();

    return true;
  }

  async setNomination(
    address: string,
    era: number,
    targets: string[],
    bonded: number,
    blockHash: string
  ): Promise<boolean> {
    logger.info(
      `(Db::setNomination) Setting nomination for ${address} bonded with ${bonded} for era ${era} to the following validators: ${targets}`
    );

    const data = await this.nominationModel.findOne({
      address: address,
      era: era,
    });

    if (!!data && data.blockHash) return;

    if (!data) {
      const nomination = new this.nominationModel({
        address: address,
        era: era,
        validators: targets,
        timestamp: Date.now(),
        bonded: bonded,
        blockHash: blockHash,
      });

      return nomination.save();
    }

    this.nominationModel
      .findOneAndUpdate({
        address: address,
        era: era,
        validators: targets,
        timestamp: Date.now(),
        bonded: bonded,
        blockHash: blockHash,
      })
      .exec();
  }

  async getNomination(address: string, era: number): Promise<string[]> {
    const data = await this.nominationModel.findOne({
      address: address,
      era: era,
    });
    return data;
  }

  async setBotClaimEvent(
    address: string,
    era: number,
    blockHash: string
  ): Promise<boolean> {
    logger.info(
      `(Db::setBotClaimEvent) Setting bot claim event for ${address} for era ${era} with blockhash: ${blockHash}.`
    );

    const data = await this.botClaimEventModel.findOne({
      address: address,
      era: era,
    });

    if (!!data && data.blockHash) return;

    if (!data) {
      const botClaimEvent = new this.botClaimEventModel({
        address: address,
        era: era,
        timestamp: Date.now(),
        blockHash: blockHash,
      });

      return botClaimEvent.save();
    }
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

  async setLastNominatedEraIndex(index: number): Promise<boolean> {
    const data = await this.eraModel.findOne({ lastNominatedEraIndex: /.*/ });
    if (!data) {
      const eraIndex = new this.eraModel({
        lastNominatedEraIndex: index.toString(),
        when: Date.now(),
      });
      return eraIndex.save();
    }

    return this.eraModel
      .findOneAndUpdate(
        { lastNominatedEraIndex: /.*/ },
        {
          $set: {
            lastNominatedEraIndex: index.toString(),
            when: Date.now(),
            nextNomination: Date.now() + 86400000,
          },
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
          rank: data.rank - Math.floor(data.rank / 6),
          faults: data.faults + 1,
        }
      )
      .exec();

    return true;
  }

  // Dock rank when an unclaimed reward is claimed by the bot
  async dockPointsUnclaimedReward(stash: string): Promise<boolean> {
    logger.info(`Docking points for ${stash}.`);

    const data = await this.candidateModel.findOne({ stash });
    await this.candidateModel
      .findOneAndUpdate(
        {
          stash,
        },
        {
          rank: data.rank - 5,
        }
      )
      .exec();

    return true;
  }

  async forgiveDockedPoints(stash: string): Promise<boolean> {
    logger.info(`Forgiving docked points for ${stash}`);

    const data = await this.candidateModel.findOne({ stash });
    await this.candidateModel
      .findOneAndUpdate(
        {
          stash,
        },
        {
          rank: data.rank * 2 + 1,
          faults: data.faults - 1,
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
            // TMP - forgive offline
            offlineSince: 0,
            offlineAccumulated: 0,
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
    return this.candidateModel.find({ name: /.*/ }).exec();
  }

  async allNominators(): Promise<any[]> {
    return this.nominatorModel.find({ address: /.*/ }).exec();
  }

  async allNominations(): Promise<any[]> {
    return this.nominationModel.find({ address: /.*/ }).exec();
  }

  /**
   * Gets a candidate by its stash address.
   * @param stashOrName The DOT / KSM address or the name of the validator.
   */
  async getCandidate(stashOrName: string): Promise<any> {
    let data = await this.candidateModel.findOne({ stash: stashOrName }).exec();

    if (!data) {
      data = await this.candidateModel.findOne({ name: stashOrName }).exec();
    }

    return data;
  }

  async getNodeByName(name: string): Promise<any> {
    return this.candidateModel.findOne({ name }).exec();
  }

  async getNominator(address: string): Promise<any> {
    return this.nominatorModel.findOne({ address }).exec();
  }

  async getLastNominatedEraIndex(): Promise<any> {
    return this.eraModel.findOne({ lastNominatedEraIndex: /[0-9]+/ }).exec();
  }

  async setChainMetadata(networkPrefix: number, handler): Promise<any> {
    const networkName =
      networkPrefix == 2
        ? "Kusama"
        : networkPrefix == 0
        ? "Polkadot"
        : "Local Testnet";
    const decimals = networkPrefix == 2 ? 12 : networkPrefix == 0 ? 10 : 12;

    logger.info(
      `(Db::setChainMetadata) Setting chain metadata: ${networkName} with ${decimals} decimals`
    );

    const data = await this.chainMetadataModel.findOne({ name: /.*/ });
    if (!data) {
      const chainMetadata = new this.chainMetadataModel({
        name: networkName,
        decimals: decimals,
      });
      return chainMetadata.save();
    }

    this.chainMetadataModel.findOneAndUpdate({
      name: networkName,
      decimals: decimals,
    });
  }

  async getChainMetadata(): Promise<any> {
    return this.chainMetadataModel.findOne({ name: /.*/ }).exec();
  }

  async getBotClaimEvents(): Promise<any> {
    return this.botClaimEventModel.find({ address: /.*/ }).exec();
  }

  // Create new Era Points records
  async setEraPoints(
    era: number,
    points: number,
    address: string
  ): Promise<any> {
    const data = await this.eraPointsModel.findOne({
      address: address,
      era: era,
    });

    // If the era points already exist and are the same as before, return
    if (!!data && data.eraPoints == points) return;

    // If they don't exist
    if (!data) {
      const eraPoints = new this.eraPointsModel({
        address: address,
        era: era,
        eraPoints: points,
      });

      return eraPoints.save();
    }

    this.eraPointsModel
      .findOneAndUpdate(
        {
          address: address,
          era: era,
        },
        {
          eraPoints: points,
        }
      )
      .exec();
  }

  async getEraPoints(era: number, address: string): Promise<any> {
    return await this.eraPointsModel.findOne({
      address: address,
      era: era,
    });
  }

  // Creates new record of era points for all validators for an era
  async setTotalEraPoints(
    era: number,
    total: number,
    validators: { address: string; eraPoints: number }[]
  ): Promise<any> {
    for (const validator of validators) {
      // Try setting the era points
      await this.setEraPoints(era, validator.eraPoints, validator.address);
    }

    // Check if a record already exists
    const data = await this.totalEraPointsModel.findOne({
      era: era,
    });

    // If it exists and the total era points are the same, return
    if (!!data && data.total == total && data.median) return;

    const points = [];
    for (const v of validators) {
      points.push(v.eraPoints);
    }

    // Find median, max, and average era points
    const getAverage = (list) =>
      list.reduce((prev, curr) => prev + curr) / list.length;

    // Calculate Median
    const getMedian = (array) => {
      // Check If Data Exists
      if (array.length >= 1) {
        // Sort Array
        array = array.sort((a, b) => {
          return a - b;
        });

        // Array Length: Even
        if (array.length % 2 === 0) {
          // Average Of Two Middle Numbers
          return (array[array.length / 2 - 1] + array[array.length / 2]) / 2;
        }
        // Array Length: Odd
        else {
          // Middle Number
          return array[(array.length - 1) / 2];
        }
      } else {
        // Error
        console.error("Error: Empty Array (calculateMedian)");
      }
    };

    const max = Math.max(...points);
    const min = Math.min(...points);
    const avg = getAverage(points);
    const median = getMedian(points);

    // If it doesn't exist, create it
    if (!data) {
      const totalEraPoints = new this.totalEraPointsModel({
        era: era,
        totalEraPoints: total,
        validatorsEraPoints: validators,
        median: median,
        average: avg,
        max: max,
        min: min,
      });

      return totalEraPoints.save();
    }

    // It exists, update it
    this.totalEraPointsModel
      .findOneAndUpdate(
        {
          era: era,
        },
        {
          totalEraPoints: total,
          validatorsEraPoints: validators,
          median: median,
          average: avg,
          max: max,
          min: min,
        }
      )
      .exec();
  }

  async getTotalEraPoints(era: number): Promise<any> {
    return await this.totalEraPointsModel.findOne({
      era: era,
    });
  }

  async getLastTotalEraPoints(): Promise<any> {
    return await this.totalEraPointsModel.find({}).sort("-era").limit(1);
  }

  async getSpanEraPoints(address: string, currentEra: number): Promise<any> {
    return await this.eraPointsModel
      .find({ address: address, era: { $gte: currentEra - 28 } })
      .exec();
  }

  // Gets the era points for a validator for the past 84 eras from a current era
  async getHistoryDepthEraPoints(
    address: string,
    currentEra: number
  ): Promise<any> {
    return await this.eraPointsModel
      .find({ address: address, era: { $gte: currentEra - 84 } })
      .exec();
  }

  async getHistoryDepthTotalEraPoints(currentEra: number): Promise<any> {
    return await this.totalEraPointsModel
      .find({ era: { $gte: currentEra - 84 } })
      .exec();
  }

  async setInclusion(address: string, inclusion: number): Promise<boolean> {
    logger.info(
      `(Db::setInclusion) Setting ${address} inclusion to ${inclusion}.`
    );

    return this.candidateModel
      .findOneAndUpdate(
        {
          stash: address,
        },
        {
          $set: { inclusion: inclusion },
        }
      )
      .exec();
  }

  async setSpanInclusion(
    address: string,
    spanInclusion: number
  ): Promise<boolean> {
    logger.info(
      `(Db::setInclusion) Setting ${address} span inclusion to ${spanInclusion}.`
    );

    return this.candidateModel
      .findOneAndUpdate(
        {
          stash: address,
        },
        {
          $set: { spanInclusion: spanInclusion },
        }
      )
      .exec();
  }

  async setRewardDestination(
    address: string,
    rewardDestination: string
  ): Promise<boolean> {
    logger.info(
      `(Db::setRewardDestination) Setting ${address} reward destination to ${rewardDestination}.`
    );

    return this.candidateModel
      .findOneAndUpdate(
        {
          stash: address,
        },
        {
          $set: { rewardDestination: rewardDestination },
        }
      )
      .exec();
  }

  async setQueuedKeys(address: string, queuedKeys: string): Promise<boolean> {
    logger.info(
      `(Db::setQueuedKeys) Setting ${address} queued keys to ${queuedKeys}.`
    );

    return this.candidateModel
      .findOneAndUpdate(
        {
          stash: address,
        },
        {
          $set: { queuedKeys: queuedKeys },
        }
      )
      .exec();
  }

  async setNextKeys(address: string, nextKeys: string): Promise<boolean> {
    logger.info(
      `(Db::setNextKeys) Setting ${address} next keys to ${nextKeys}.`
    );

    return this.candidateModel
      .findOneAndUpdate(
        {
          stash: address,
        },
        {
          $set: { nextKeys: nextKeys },
        }
      )
      .exec();
  }

  async setActive(address: string, active: boolean): Promise<boolean> {
    return this.candidateModel
      .findOneAndUpdate(
        {
          stash: address,
        },
        {
          $set: { active: active },
        }
      )
      .exec();
  }

  async setEraStats(
    era: number,
    totalNodes: number,
    valid: number,
    active: number
  ): Promise<boolean> {
    const data = await this.eraStatsModel.findOne({
      era: era,
    });

    // If the era stats already exist and are the same as before, return
    if (
      !!data &&
      data.totalNodes == totalNodes &&
      data.valid == valid &&
      data.active == active
    )
      return;

    // If they don't exist
    if (!data) {
      const eraStats = new this.eraStatsModel({
        era: era,
        when: Date.now(),
        totalNodes: totalNodes,
        valid: valid,
        active: active,
      });

      return eraStats.save();
    }

    // It exists, but has a different value - update it
    this.eraStatsModel
      .findOneAndUpdate(
        {
          era: era,
        },
        {
          when: Date.now(),
          totalNodes: totalNodes,
          valid: valid,
          active: active,
        }
      )
      .exec();
  }

  async getLatestEraStats(): Promise<any> {
    return await this.eraStatsModel.find({}).sort("-era").limit(1);
  }
}
