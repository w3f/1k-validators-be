// Adds a new candidate from the configuration file data.
import { Keyring } from "@polkadot/keyring";
import logger from "../../logger";
import { CandidateModel } from "../models";
import { NodeDetails } from "../index";
import { fetchLocationInfo } from "../../util";
import { getChainMetadata } from "./ChainMetadata";
import { getIIT, getLocation, setLocation } from "./Location";

// Adds a new candidate from the configuration file data.
export const addCandidate = async (
  name: string,
  stash: string,
  kusamaStash: string,
  skipSelfStake: boolean,
  bio: string,
  matrix: any,
  bot?: any
): Promise<boolean> => {
  const network = (await getChainMetadata()).name;
  const keyring = new Keyring();
  const ss58Prefix = network == "Kusama" ? 2 : 0;
  stash = keyring.encodeAddress(stash, ss58Prefix);
  logger.info(
    `(Db::addCandidate) name: ${name} stash: ${stash} matrix: ${matrix}`
  );

  // Check to see if the candidate has already been added as a node.
  const data = await CandidateModel.findOne({ name }).lean();
  if (!data) {
    logger.info(
      `(Db::addCandidate) Did not find candidate data for ${name} - inserting new document.`
    );

    const candidate = new CandidateModel({
      name,
      stash,
      kusamaStash,
      skipSelfStake,
      bio,
      matrix,
    });

    if (!!bot) {
      await bot.sendMessage(`Adding new candidate: ${name} (${stash})`);
    }
    await candidate.save();
    return true;
  }

  // If already has the node data by name, just store the candidate specific
  // stuff.
  return CandidateModel.findOneAndUpdate(
    {
      name,
    },
    {
      stash,
      kusamaStash,
      skipSelfStake,
      bio,
      matrix,
    }
  );
};

// Unsets old candidate fields.
export const deleteOldCandidateFields = async (): Promise<boolean> => {
  await CandidateModel.updateMany(
    {},
    {
      $unset: {
        sentryId: 1,
        sentryOnlineSince: 1,
        sentryOfflineSince: 1,
        telemetryId: 1,
        valid: 1,
        invalidityReasons: 1,
      },
    },
    { multi: true, safe: true }
  );

  return true;
};

export const deleteOldFieldFrom = async (name: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { name },
    {
      $unset: {
        sentryId: 1,
        sentryOnlineSince: 1,
        sentryOfflineSince: 1,
        telemetryId: 1,
      },
    }
  ).exec();

  return true;
};

export const clearNodeRefsFrom = async (name: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate({ name }, { nodeRefs: 0 }).exec();

  return true;
};

// Sets an invalidityReason for a candidate.
export const setInvalidityReason = async (
  stash: string,
  reason: string
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    {
      invalidityReasons: reason,
    }
  ).exec();

  return true;
};

export const setLastValid = async (stash: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { lastValid: Date.now() }
  ).exec();
  return true;
};

export const setCommission = async (
  stash: string,
  commission: number
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { commission: commission }
  ).exec();
  return true;
};

export const setController = async (
  stash: string,
  controller: string
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { controller: controller }
  ).exec();
  return true;
};

export const setIdentity = async (
  stash: string,
  identity: { name: string; sub: string; verified: boolean }
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { identity: identity }
  ).exec();
  return true;
};

export const reportBestBlock = async (
  telemetryId: number,
  details: NodeDetails,
  now: number
): Promise<boolean> => {
  const block = details[0];
  const data = await CandidateModel.findOne({ telemetryId }).lean();

  if (!data) return false;

  // logger.info(`Reporting best block for ${data.name}: ${details}`);

  // If the node was previously deemed offline
  if (data.offlineSince && data.offlineSince !== 0) {
    // Get the list of all other validtity reasons besides online
    const invalidityReasons = data.invalidity.filter((invalidityReason) => {
      return invalidityReason.type !== "ONLINE";
    });

    const timeOffline = now - data.offlineSince;
    const accumulated = (data.offlineAccumulated || 0) + timeOffline;

    await CandidateModel.findOneAndUpdate(
      { telemetryId },
      {
        offlineSince: 0,
        onlineSince: now,
        offlineAccumulated: accumulated,
        invalidity: [
          ...invalidityReasons,
          {
            valid: true,
            type: "ONLINE",
            updated: Date.now(),
            details: ``,
          },
        ],
      }
    ).exec();
  }
  return true;
};

// Reports a node online that has joined telemetry.
export const reportOnline = async (
  telemetryId: number,
  details: NodeDetails,
  now: number,
  startupTime: number
): Promise<boolean> => {
  const [name, nodeImplementation, version, address, networkId, addr] = details;

  let locationData;
  locationData = await getLocation(name, addr);
  const shouldFetch =
    !locationData || (locationData?.addr && locationData?.addr != addr);
  if (shouldFetch) {
    const iit = await getIIT();
    const { city, region, country, asn, provider } = await fetchLocationInfo(
      addr,
      iit && iit.iit ? iit.iit : null
    );

    await setLocation(name, addr, city, region, country, asn, provider);
    locationData = await getLocation(name, addr);
  }

  if (!addr) {
    logger.info(`{reportOnline}: no addr sent for ${name}`);
  }

  const data = await CandidateModel.findOne({ name }).lean();
  if (!data) {
    // A new node that is not already registered as a candidate.
    const candidate = new CandidateModel({
      telemetryId,
      location:
        locationData && locationData?.city ? locationData?.city : "No Location",
      networkId: null,
      nodeRefs: 1,
      name,
      version,
      discoveredAt: startupTime,
      onlineSince: startupTime,
      offlineSince: 0,
      infrastructureLocation: locationData,
    });

    await candidate.save();
    return true;
  }

  // Get the list of all other validtity reasons besides online
  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "ONLINE";
  });

  // T
  if (!data.discoveredAt) {
    await CandidateModel.findOneAndUpdate(
      { name },
      {
        telemetryId,
        location:
          locationData && locationData?.city
            ? locationData?.city
            : "No Location",
        infrastructureLocation: locationData,
        discoveredAt: now,
        onlineSince: now,
        offlineSince: 0,
        invalidity: [
          ...invalidityReasons,
          {
            valid: true,
            type: "ONLINE",
            updated: Date.now(),
            details: ``,
          },
        ],
      }
    ).exec();
  }

  // Always
  //  - Update the version
  //  - Telemetry Id
  //  - Update the node refs
  //  - Update that the node is online
  await CandidateModel.findOneAndUpdate(
    { name },
    {
      telemetryId,
      location:
        locationData && locationData?.city ? locationData?.city : "No Location",
      infrastructureLocation: locationData,
      onlineSince: now,
      version,
      invalidity: [
        ...invalidityReasons,
        {
          valid: true,
          type: "ONLINE",
          updated: Date.now(),
          details: ``,
        },
      ],
      $inc: { nodeRefs: 1 },
    }
  ).exec();

  if (data.offlineSince && data.offlineSince !== 0) {
    // logger.info(
    //   `Online node ${data.name} with id ${telemetryId} was offline since: ${data.offlineSince}`
    // );
    // The node was previously offline.
    const timeOffline = now - data.offlineSince;
    const accumulated = (data.offlineAccumulated || 0) + timeOffline;

    await CandidateModel.findOneAndUpdate(
      {
        name,
      },
      {
        offlineSince: 0,
        offlineAccumulated: accumulated,
      }
    ).exec();
    return true;
  }
};

/**
 * The reportOffline function does no verification, so its anticipated that
 * whatever is calling it has already verified the node is indeed offline.
 * @param telemetryId The inerited ID from telemetry for this node.
 * @param name The name of the node.
 * @param now The timestamp for now (in ms).
 */
export const reportOffline = async (
  telemetryId: number,
  name: string,
  now: number
): Promise<boolean> => {
  // logger.info(
  //   `(Db::reportOffline) Reporting ${name} with telemetry id ${telemetryId} offline at ${now}.`
  // );

  const data = await CandidateModel.findOne({ telemetryId }).lean();

  if (!data) {
    logger.info(`(Db::reportOffline) No data for node named ${name}.`);
    return false;
  }

  // Get the list of all other validtity reasons besides online
  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "ONLINE";
  });

  // If more than one node has this name, we assume the validator is updating.
  // Only decrement the nodeRefs, don't mark offline.
  if (data.nodeRefs > 1) {
    return CandidateModel.findOneAndUpdate(
      { telemetryId },
      {
        $inc: {
          nodeRefs: -1,
        },
        invalidity: [
          ...invalidityReasons,
          {
            valid: true,
            type: "ONLINE",
            updated: Date.now(),
            details: ``,
          },
        ],
      }
    );
  }

  return CandidateModel.findOneAndUpdate(
    {
      telemetryId,
    },
    {
      offlineSince: now,
      onlineSince: 0,
      $inc: {
        nodeRefs: -1,
      },
      invalidity: [
        ...invalidityReasons,
        {
          valid: false,
          type: "ONLINE",
          updated: Date.now(),
          details: `${data.name} offline. Offline since ${data.offlineSince}.`,
        },
      ],
    }
  );
};

export const reportUpdated = async (name: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      name,
    },
    {
      updated: true,
    }
  ).exec();
  return true;
};

export const reportNotUpdated = async (name: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      name,
    },
    {
      updated: false,
    }
  ).exec();
  return true;
};

export const pushRankEvent = async (
  stash: string,
  startEra: number,
  activeEra: number
): Promise<boolean> => {
  const record = await CandidateModel.findOne({ stash }).lean();
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

  await CandidateModel.findOneAndUpdate(
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
};

export const pushFaultEvent = async (
  stash: string,
  reason: string
): Promise<boolean> => {
  logger.info(
    `(Db::pushFault) Adding new fault for ${stash} for reason ${reason}`
  );

  const record = await CandidateModel.findOne({ stash }).lean();
  if (!record) {
    return false;
  }

  let alreadyFault = false;
  for (const fault of record.faultEvents) {
    if (fault.reason == reason) {
      alreadyFault = true;
    }
  }
  if (alreadyFault) return true;

  await CandidateModel.findOneAndUpdate(
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
  return false;
};

export const addPoint = async (stash: string): Promise<boolean> => {
  logger.info(`Adding a point to ${stash}.`);

  const data = await CandidateModel.findOne({ stash }).lean();
  await CandidateModel.findOneAndUpdate(
    {
      stash,
    },
    {
      rank: data.rank + 1,
    }
  ).exec();

  return true;
};

export const dockPoints = async (stash: string): Promise<boolean> => {
  logger.info(`Docking points for ${stash}.`);

  const data = await CandidateModel.findOne({ stash }).lean();
  await CandidateModel.findOneAndUpdate(
    {
      stash,
    },
    {
      rank: data.rank - Math.floor(data.rank / 6),
      faults: data.faults + 1,
    }
  ).exec();

  return true;
};

// Dock rank when an unclaimed reward is claimed by the bot
export const dockPointsUnclaimedReward = async (
  stash: string
): Promise<boolean> => {
  logger.info(`Docking points for ${stash}.`);

  const data = await CandidateModel.findOne({ stash }).lean();
  await CandidateModel.findOneAndUpdate(
    {
      stash,
    },
    {
      rank: data.rank - 3,
    }
  ).exec();

  return true;
};

/** Storage GETTERS and SETTERS */

export const clearAccumulated = async (): Promise<boolean> => {
  logger.info(`(Db::clearAccumulated) Clearing offline accumulated time.`);

  const candidates = await allCandidates();
  if (!candidates.length) {
    // nothing to do
    return true;
  }

  for (const candidate of candidates) {
    const { name, offlineAccumulated } = candidate;
    if (offlineAccumulated > 0) {
      await CandidateModel.findOneAndUpdate(
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
};

export const clearCandidates = async (): Promise<boolean> => {
  logger.info(`(Db::clearCandidates) Clearing stale candidate data.`);

  const candidates = await allCandidates();
  if (!candidates.length) {
    // nothing to do
    return true;
  }

  for (const candidate of candidates) {
    const { name } = candidate;
    await CandidateModel.findOneAndUpdate(
      {
        name,
      },
      {
        stash: null,
        // TMP - forgive offline
        offlineSince: 0,
        offlineAccumulated: 0,
      }
    ).exec();
  }

  return true;
};

export const allCandidates = async (): Promise<any[]> => {
  return CandidateModel.find({ stash: /.*/ }).lean().exec();
};

export const validCandidates = async (): Promise<any[]> => {
  return CandidateModel.find({ valid: true }).lean().exec();
};

export const allNodes = async (): Promise<any[]> => {
  return CandidateModel.find({ name: /.*/ }).lean().exec();
};

/**
 * Gets a candidate by its stash address.
 * @param stashOrName The DOT / KSM address or the name of the validator.
 */
export const getCandidate = async (stashOrName: string): Promise<any> => {
  let data = await CandidateModel.findOne({ stash: stashOrName }).lean().exec();

  if (!data) {
    data = await CandidateModel.findOne({ name: stashOrName }).lean().exec();
  }

  return data;
};

export const getNodeByName = async (name: string): Promise<any> => {
  return CandidateModel.findOne({ name }).lean().exec();
};

export const setInclusion = async (
  address: string,
  inclusion: number
): Promise<boolean> => {
  logger.debug(
    `(Db::setInclusion) Setting ${address} inclusion to ${inclusion}.`
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { inclusion: inclusion },
    }
  ).exec();
  return true;
};

export const setSpanInclusion = async (
  address: string,
  spanInclusion: number
): Promise<boolean> => {
  logger.debug(
    `(Db::setInclusion) Setting ${address} span inclusion to ${spanInclusion}.`
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { spanInclusion: spanInclusion },
    }
  ).exec();
  return true;
};

export const setBonded = async (
  address: string,
  bonded: number
): Promise<boolean> => {
  logger.debug(`(Db::setBonded) Setting ${address} bonded to ${bonded}.`);

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { bonded: bonded },
    }
  ).exec();
  return true;
};

export const setRewardDestination = async (
  address: string,
  rewardDestination: string
): Promise<boolean> => {
  logger.debug(
    `(Db::setRewardDestination) Setting ${address} reward destination to ${rewardDestination}.`
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { rewardDestination: rewardDestination },
    }
  ).exec();
  return true;
};

export const setQueuedKeys = async (
  address: string,
  queuedKeys: string
): Promise<boolean> => {
  logger.debug(
    `(Db::setQueuedKeys) Setting ${address} queued keys to ${queuedKeys}.`
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { queuedKeys: queuedKeys },
    }
  ).exec();
  return true;
};

export const setNextKeys = async (
  address: string,
  nextKeys: string
): Promise<boolean> => {
  logger.debug(
    `(Db::setNextKeys) Setting ${address} next keys to ${nextKeys}.`
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { nextKeys: nextKeys },
    }
  ).exec();
  return true;
};

export const setActive = async (
  address: string,
  active: boolean
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { active: active },
    }
  ).exec();
  return true;
};

// updates a candidates council backing amounts and who they vote for
export const setCouncilBacking = async (
  address: string,
  councilStake: number,
  councilVotes: any[]
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { councilStake: councilStake, councilVotes: councilVotes },
    }
  ).exec();
  return true;
};

// Set Online Validity Status
export const setOnlineValidity = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Validate Intention} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "ONLINE";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "ONLINE",
          updated: Date.now(),
          details: validity
            ? ""
            : `${data.name} offline. Offline since ${data.offlineSince}.`,
        },
      ],
    }
  ).exec();
};

// Set Validate Intention Status
export const setValidateIntentionValidity = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Validate Intention} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "VALIDATE_INTENTION";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "VALIDATE_INTENTION",
          updated: Date.now(),
          details: validity
            ? ""
            : `${data.name} does not have a validate intention.`,
        },
      ],
    }
  ).exec();
};

// Set Client Version Validity Status
export const setLatestClientReleaseValidity = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Latest Client} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "CLIENT_UPGRADE";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "CLIENT_UPGRADE",
          updated: Date.now(),
          details: validity
            ? ""
            : `${data.name} is not on the latest client version`,
        },
      ],
    }
  ).exec();
};

// Set Connection Time Validity Status
export const setConnectionTimeInvalidity = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Connection Time} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "CONNECTION_TIME";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "CONNECTION_TIME",
          updated: Date.now(),
          details: validity
            ? ""
            : `${data.name} has not been connected for minimum length`,
        },
      ],
    }
  ).exec();
};

// Set Identity Validity Status
export const setIdentityInvalidity = async (
  address: string,
  validity: boolean,
  details?: string
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Identity} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "IDENTITY";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "IDENTITY",
          updated: Date.now(),
          details: validity
            ? ""
            : details
            ? details
            : `${data.name} has not properly set their identity`,
        },
      ],
    }
  ).exec();
};

// Set Identity Validity Status
export const setOfflineAccumulatedInvalidity = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Offline Accumulated} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "ACCUMULATED_OFFLINE_TIME";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "ACCUMULATED_OFFLINE_TIME",
          updated: Date.now(),
          details: validity
            ? ""
            : `${data.name} has been offline ${
                data.offlineAccumulated / 1000 / 60
              } minutes this week.`,
        },
      ],
    }
  ).exec();
};

// Set Identity Validity Status
export const setRewardDestinationInvalidity = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Reward Destination} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "REWARD_DESTINATION";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "REWARD_DESTINATION",
          updated: Date.now(),
          details: validity
            ? ""
            : `${data.name} does not have reward destination as Staked`,
        },
      ],
    }
  ).exec();
};

// Set Identity Validity Status
export const setCommissionInvalidity = async (
  address: string,
  validity: boolean,
  details?: string
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Commission} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "COMMISION";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "COMMISION",
          updated: Date.now(),
          details: validity
            ? ""
            : details
            ? details
            : `${data.name} has not properly set their commission`,
        },
      ],
    }
  ).exec();
};

// Set Self Stake Validity Status
export const setSelfStakeInvalidity = async (
  address: string,
  validity: boolean,
  details?: string
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "SELF_STAKE";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "SELF_STAKE",
          updated: Date.now(),
          details: validity
            ? ""
            : details
            ? details
            : `${data.name} has not properly bonded enough self stake`,
        },
      ],
    }
  ).exec();
};

// Set Unclaimed Era Validity Status
export const setUnclaimedInvalidity = async (
  address: string,
  validity: boolean,
  details?: string
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "UNCLAIMED_REWARDS";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "UNCLAIMED_REWARDS",
          updated: Date.now(),
          details: validity
            ? ""
            : details
            ? details
            : `${data.name} has not properly claimed era rewards`,
        },
      ],
    }
  ).exec();
};

// Set Blocked Validity Status
export const setBlockedInvalidity = async (
  address: string,
  validity: boolean,
  details?: string
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "BLOCKED";
  });
  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "BLOCKED",
          updated: Date.now(),
          details: validity
            ? ""
            : details
            ? details
            : `${data.name} blocks external nominations`,
        },
      ],
    }
  ).exec();
};

// Set Kusama Rank Validity Status
export const setKusamaRankInvalidity = async (
  address: string,
  validity: boolean,
  details?: string
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    logger.warn(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data.invalidity.filter((invalidityReason) => {
    return invalidityReason.type !== "KUSAMA_RANK";
  });

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "KUSAMA_RANK",
          updated: Date.now(),
          details: validity
            ? ""
            : details
            ? details
            : `${data.name} has not properly claimed era rewards`,
        },
      ],
    }
  ).exec();
};

// Sets valid boolean for node
export const setValid = async (
  address: string,
  validity: boolean
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean();

  if (!data) {
    logger.warn(`{Valid} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      valid: validity,
    }
  ).exec();
};
