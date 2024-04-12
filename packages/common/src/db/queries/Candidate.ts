// Adds a new candidate from the configuration file data.
import { Keyring } from "@polkadot/keyring";
import logger from "../../logger";
import {
  Candidate,
  CandidateModel,
  IdentityModel,
  InvalidityReasonType,
} from "../models";
import { dbLabel } from "../index";
import { getChainMetadata } from "./ChainMetadata";
import { Identity, TelemetryNodeDetails } from "../../types";
import { fetchAndSetCandidateLocation } from "../../utils/Location";
import {
  mergeTelemetryNodeToCandidate,
  reportTelemetryNodeOffline,
  reportTelemetryNodeOnline,
} from "./TelemetryNode";
import { setCandidateInvalidity } from "./CandidateUtils";

export const candidateExists = async (
  slotId: number,
  name: string,
  stash: string,
): Promise<boolean> => {
  const exists = await CandidateModel.exists({
    $or: [{ slotId: slotId }, { name: name }, { stash: stash }],
  });
  return !!exists;
};

export const candidateExistsByName = async (name: string): Promise<boolean> => {
  const exists = await CandidateModel.exists({ name });
  return !!exists;
};

export const candidateExistsByStash = async (
  stash: string,
): Promise<boolean> => {
  const exists = await CandidateModel.exists({ stash });
  return !!exists;
};

export const candidateExistsBySlotId = async (
  slotId: number,
): Promise<boolean> => {
  const exists = await CandidateModel.exists({ slotId });
  return !!exists;
};

// Adds a new candidate from the configuration file data.
export const addCandidate = async (
  slotId: number,
  name: string,
  stash: string,
  kusamaStash: string,
  skipSelfStake: boolean,
  matrix: any,
  kyc: boolean,
  bot?: any,
): Promise<boolean> => {
  try {
    if (slotId == undefined) {
      logger.warn(`No slotId for ${name} - skipping.`, { label: "Candidate" });
      return false;
    }

    const network = (await getChainMetadata())?.name;
    const keyring = new Keyring();
    const ss58Prefix = network == "Kusama" ? 2 : 0;
    stash = keyring.encodeAddress(stash, ss58Prefix);

    let data;

    // Check to see if the candidate has already been added as a node.
    data = await CandidateModel.findOne({ slotId }).lean<Candidate>();

    if (!data) {
      data = await CandidateModel.findOne({ name }).lean<Candidate>();
    }

    if (!data) {
      const candidate = new CandidateModel({
        slotId,
        name,
        stash,
        kusamaStash,
        skipSelfStake,
        matrix,
        kyc,
      });

      if (!!bot) {
        await bot.sendMessage(
          `Adding new candidate: ${name} (${stash}) id: ${slotId}`,
        );
      }
      await candidate.save();
      return true;
    }

    // If already has the node data by name, just store the candidate specific
    // stuff.
    await CandidateModel.findOneAndUpdate(
      { $or: [{ slotId: slotId }, { name: name }] },
      {
        name,
        slotId,
        stash,
        kusamaStash,
        skipSelfStake,
        matrix,
        kyc,
      },
    ).exec();
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error adding candidate ${name}`, dbLabel);
    return false;
  }
};

// Unsets old candidate fields.
export const deleteOldCandidateFields = async (): Promise<boolean> => {
  await CandidateModel.updateMany(
    {},
    {
      $unset: {
        bio: "",
        networkId: "",
        sentryId: "",
        sentryOnlineSince: "",
        sentryOfflineSince: "",
        telemetryId: "",
        rankEvents: "",
        invalidityReasons: "",
        avgClaimTimestampDelta: "",
        avgClaimBlockDelta: "",
        totalRewards: "",
        democracyVoteCount: "",
        democracyVotes: "",
        councilStake: "",
        councilVotes: "",
        location: "",
        infrastructureLocation: "",
        telemetryDetails: "",
        convictionVoteCount: "",
        convictionVotes: "",
      },
    },
    // { multi: true, safe: true }
  ).exec();

  return true;
};

export const deleteOldFieldFrom = async (name: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { name },
    {
      $unset: {
        sentryId: "",
        sentryOnlineSince: "",
        sentryOfflineSince: "",
        telemetryId: "",
        rankEvents: "",
        avgClaimTimestampDelta: "",
        avgClaimBlockDelta: "",
        location: "",
        infrastructureLocation: "",
      },
    },
  ).exec();

  return true;
};

export const clearCandidateNodeRefsFrom = async (
  name: string,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate({ name }, { nodeRefs: 0 }).exec();

  return true;
};

// Sets an invalidityReason for a candidate.
export const setInvalidityReason = async (
  stash: string,
  reason: string,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    {
      invalidityReasons: reason,
    },
  ).exec();

  return true;
};

export const setLastValid = async (stash: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { lastValid: Date.now() },
  ).exec();
  return true;
};

export const setCommission = async (
  stash: string,
  commission: number,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { commission: commission },
  ).exec();
  return true;
};

export const setController = async (
  stash: string,
  controller: string,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { stash },
    { controller: controller },
  ).exec();
  return true;
};

export const deleteAllIdentities = async (): Promise<boolean> => {
  await IdentityModel.deleteMany({}).exec();
  return true;
};

// Creates an Identity Record
export const setIdentity = async (identity: Identity): Promise<boolean> => {
  if (!identity || !identity?.name) return false;
  const data = await IdentityModel.findOne({ name: identity.name })
    .lean<Identity>()
    .exec();
  if (!data) {
    const ident = new IdentityModel({
      name: identity.name,
      address: identity.address,
      verified: identity.verified,
      subIdentities: identity.subIdentities,
      display: identity.display,
      email: identity.email,
      image: identity.image,
      judgements: identity.judgements,
      legal: identity.legal,
      pgp: identity.pgp,
      riot: identity.riot,
      twitter: identity.twitter,
      web: identity.web,
    });
    await ident.save();
    return true;
  } else {
    await IdentityModel.findOneAndUpdate(
      {
        name: identity.name,
      },
      {
        address: identity.address,
        verified: identity.verified,
        subIdentities: identity.subIdentities,
        display: identity.display,
        email: identity.email,
        image: identity.image,
        judgements: identity.judgements,
        legal: identity.legal,
        pgp: identity.pgp,
        riot: identity.riot,
        twitter: identity.twitter,
        web: identity.web,
      },
    );
    return true;
  }
};

// both create an `Identity` record, and add the identity to the candidate
export const setCandidateIdentity = async (
  stash: string,
  identity: Identity,
): Promise<boolean> => {
  try {
    if (identity) {
      let data;
      data = await getIdentity(stash);
      if (!data) {
        await setIdentity(identity);
        data = await getIdentity(stash);
      }

      await CandidateModel.findOneAndUpdate(
        { stash },
        { identity: data },
      ).exec();
      return true;
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error setting identity for ${stash}`, dbLabel);
    return false;
  }
};

export const getAllIdentities = async (): Promise<Identity[]> => {
  return await IdentityModel.find({}).lean<Identity[]>();
};

export const getIdentityName = async (
  address: string,
): Promise<string | null> => {
  if (!address) return null;
  const superIdentity = await IdentityModel.findOne({ address: address })
    .lean<Identity>()
    .select({ name: 1 });
  if (superIdentity) {
    return superIdentity.name;
  } else {
    const identity = await IdentityModel.findOne({
      "subIdentities.address": address,
    })
      .lean<Identity>()
      .select({ name: 1 });

    return identity?.name || null;
  }
};

export const getIdentity = async (
  address: string,
): Promise<Identity | null> => {
  const superIdentity = await IdentityModel.findOne({ address: address })
    .select({
      _id: 0,
      __v: 0,
    })
    .lean<Identity>();
  if (superIdentity) {
    return superIdentity;
  } else {
    const identity = await IdentityModel.findOne({
      "subIdentities.address": address,
    })
      .select({
        _id: 0,
        __v: 0,
      })
      .lean<Identity>();
    return identity;
  }
};

// Given an address, get all the other addresses that are a part of the identity
export const getIdentityAddresses = async (
  address: string,
): Promise<string[]> => {
  const identity = await getIdentity(address);
  const addresses: string[] = [];
  if (identity) {
    const address = identity?.address;
    addresses.push(address);
    const subIdentities = identity?.subIdentities;

    if (subIdentities) {
      for (const subIdentity of subIdentities) {
        addresses.push(subIdentity?.address);
      }
    }
  }
  return addresses;
};

export const setCandidateOnlineValid = async (
  candidate: Candidate,
): Promise<void> => {
  setCandidateInvalidity(candidate, InvalidityReasonType.ONLINE, true);

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      onlineSince: Date.now(),
    },
  ).exec();
};

export const setCandidateOnlineNotValid = async (
  candidate: Candidate,
): Promise<void> => {
  const invalidityMessage = `Candidate ${candidate.name} offline. Offline since ${Date.now()}.`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.ONLINE,
    false,
    invalidityMessage,
  );

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      offlineSince: Date.now(),
      onlineSince: 0, //TOCHECK: not necessary probably
      nodeRefs: 0,
    },
  ).exec();
};

// A candidate node has an online message from telemetry, update the online telemetry details
export const updateCandidateOnlineTelemetryDetails = async (
  telemetryNodeDetails: TelemetryNodeDetails,
): Promise<boolean> => {
  try {
    await CandidateModel.findOneAndUpdate(
      { name: telemetryNodeDetails.name }, // Query part
      [
        {
          $set: {
            telemetryId: { $literal: telemetryNodeDetails.telemetryId },
            version: telemetryNodeDetails.version,
            implementation: {
              $literal: telemetryNodeDetails.nodeImplementation,
            },
            discoveredAt: {
              $cond: {
                if: { $eq: ["$discoveredAt", 0] },
                then: Date.now(),
                else: "$discoveredAt",
              },
            },
            // Use $add to simulate the $inc behavior within the $set stage
            nodeRefs: { $add: ["$nodeRefs", 1] },
          },
        },
      ], // Update part using aggregation pipeline
      { new: true }, // Options: return the modified document rather than the original
    ).exec();
    logger.info(
      `Candidate node ${telemetryNodeDetails.name} with id: ${telemetryNodeDetails.telemetryId} is  online`,
      {
        label: "Telemetry",
      },
    );
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    // Correctly reference telemetryNodeDetails.name in the logging statement
    logger.error(
      `Error updating online validity for ${telemetryNodeDetails.name}`,
      dbLabel,
    );
    return false;
  }
};

export const updateCandidateOfflineTime = async (
  name: string,
): Promise<boolean> => {
  try {
    const candidate = await getCandidateByName(name);
    if (candidate && candidate.offlineSince > 0) {
      const timeOffline = Date.now() - candidate.offlineSince;
      const accumulated = (candidate.offlineAccumulated || 0) + timeOffline;

      await CandidateModel.findOneAndUpdate(
        {
          name,
        },
        {
          offlineSince: 0,
          offlineAccumulated: accumulated,
        },
      ).exec();
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error updating offline time for ${name}`, dbLabel);
    return false;
  }
};

// Reports a node online that has joined telemetry.
export const reportOnline = async (
  telemetryNodeDetails: TelemetryNodeDetails,
): Promise<boolean> => {
  try {
    const candidate = await getCandidateByName(telemetryNodeDetails.name);

    if (!candidate) {
      // The node is not a Candidate, report telemetry node online
      await reportTelemetryNodeOnline(telemetryNodeDetails);
    } else {
      // The node is a Candidate
      await mergeTelemetryNodeToCandidate(candidate);

      // Try and update or make a new Location record
      await fetchAndSetCandidateLocation(candidate, telemetryNodeDetails);

      // Update the candidate online validity
      await setCandidateOnlineValid(candidate);

      // Update any offline time
      await updateCandidateOfflineTime(telemetryNodeDetails.name);

      // Update the online telemetry details
      await updateCandidateOnlineTelemetryDetails(telemetryNodeDetails);
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(JSON.stringify(telemetryNodeDetails));
    logger.error(
      `Error reporting telemetry node online ${telemetryNodeDetails?.name}`,
      dbLabel,
    );
    return false;
  }
};

export const reportOffline = async (name: string): Promise<void> => {
  try {
    const candidate = await getCandidateByName(name);

    if (!candidate) {
      // The node is not a Candidate, report telemetry node offline
      await reportTelemetryNodeOffline(name);
    } else {
      // There is more than one node online with that telemetry name - decrease it refs but don't make it invalid
      if (candidate.nodeRefs > 1) {
        await CandidateModel.findOneAndUpdate(
          {
            name,
          },
          { $inc: { nodeRefs: -1 } },
        ).exec();
        await setCandidateOnlineValid(candidate);
      } else {
        setCandidateOnlineNotValid(candidate);
      }
    }
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(
      `Error reporting candidate or telemetry node offline ${name}`,
      dbLabel,
    );
  }
};

export const reportUpdated = async (name: string): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      name,
    },
    {
      updated: true,
    },
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
    },
  ).exec();
  return true;
};

export const pushFaultEvent = async (
  stash: string,
  reason: string,
): Promise<boolean> => {
  logger.info(
    `(Db::pushFault) Adding new fault for ${stash} for reason ${reason}`,
  );

  const record = await CandidateModel.findOne({ stash }).lean<Candidate>();
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
    },
  );
  return false;
};

export const setRank = async (
  stash: string,
  newRank: number,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      stash,
    },
    {
      rank: newRank,
    },
  ).exec();

  return true;
};

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
        },
      );
    }
  }
  return true;
};

// Sets the stash of candidates to null - run initially before adding candidates from the config so that any candidate in the db that is not in the config is removed
export const clearCandidates = async (): Promise<boolean> => {
  const candidates = await allCandidatesWithAnyFields();
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
      },
    ).exec();
  }

  return true;
};

export const allCandidatesWithAnyFields = async (): Promise<Candidate[]> => {
  return CandidateModel.find({}).lean<Candidate[]>();
};

// Retrieve all candidates that have a stash and slotId set
export const allCandidates = async (): Promise<Candidate[]> => {
  return CandidateModel.find({ stash: /.*/ }).lean<Candidate[]>();
};

export const validCandidates = async (): Promise<Candidate[]> => {
  return CandidateModel.find({ valid: true }).lean<Candidate[]>();
};

export const invalidCandidates = async (): Promise<any[]> => {
  return CandidateModel.find({ valid: false }).lean<Candidate[]>();
};

export const getCandidate = async (
  slotId: number,
  stash?: string,
  address?: string,
): Promise<Candidate | null> => {
  const query: any = { slotId };
  if (stash) query.stash = stash;
  if (address) query.address = address;

  const data = await CandidateModel.findOne(query).lean<Candidate>();

  return data;
};

export const getCandidateByName = async (
  name: string,
): Promise<Candidate | null> => {
  return CandidateModel.findOne({ name }).lean<Candidate>();
};

export const getCandidateBySlotId = async (
  id: number,
): Promise<Candidate | null> => {
  return CandidateModel.findOne({ slotId: id }).lean<Candidate>();
};

export const getCandidateByStash = async (
  stash: string,
): Promise<Candidate | null> => {
  return CandidateModel.findOne({ stash: stash }).lean<Candidate>();
};

export const setInclusion = async (
  address: string,
  inclusion: number,
): Promise<boolean> => {
  logger.debug(
    `(Db::setInclusion) Setting ${address} inclusion to ${inclusion}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { inclusion: inclusion },
    },
  ).exec();
  return true;
};

export const setSpanInclusion = async (
  address: string,
  spanInclusion: number,
): Promise<boolean> => {
  logger.debug(
    `(Db::setInclusion) Setting ${address} span inclusion to ${spanInclusion}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { spanInclusion: spanInclusion },
    },
  ).exec();
  return true;
};

export const setBonded = async (
  address: string,
  bonded: number,
): Promise<boolean> => {
  logger.debug(`(Db::setBonded) Setting ${address} bonded to ${bonded}.`);

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { bonded: bonded },
    },
  ).exec();
  return true;
};

export const setRewardDestination = async (
  address: string,
  rewardDestination: string,
): Promise<boolean> => {
  logger.debug(
    `(Db::setRewardDestination) Setting ${address} reward destination to ${rewardDestination}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { rewardDestination: rewardDestination },
    },
  ).exec();
  return true;
};

export const setQueuedKeys = async (
  address: string,
  queuedKeys: string,
): Promise<boolean> => {
  logger.debug(
    `(Db::setQueuedKeys) Setting ${address} queued keys to ${queuedKeys}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { queuedKeys: queuedKeys },
    },
  ).exec();
  return true;
};

export const setActive = async (
  address: string,
  active: boolean,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      $set: { active: active },
    },
  ).exec();
  return true;
};

export const setNominatedAtEra = async (
  address: string,
  era: number,
): Promise<any> => {
  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      nominatedAt: era,
    },
  ).exec();
  return true;
};

// Set Online Validity Status
export const setOnlineValidity = async (
  slotId: number,
  isValid: boolean,
): Promise<void> => {
  const candidate = await getCandidateBySlotId(slotId);
  const invalidityMessage = `${candidate.name} offline. Last seen online ${candidate.onlineSince}.`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.ONLINE,
    isValid,
    invalidityMessage,
  );
};

// Set Validate Intention Status
export const setValidateIntentionValidity = async (
  address: string,
  validity: boolean,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Validate Intention} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "VALIDATE_INTENTION";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) {
    await CandidateModel.findOneAndUpdate(
      {
        stash: address,
      },
      {
        invalidity: [
          {
            valid: validity,
            type: "VALIDATE_INTENTION",
            updated: Date.now(),
            details: validity
              ? ""
              : `${data.name} does not have a validate intention.`,
          },
        ],
      },
    ).exec();
    return;
  }

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
    },
  ).exec();
};

// Set Client Version Validity Status
export const setLatestClientReleaseValidity = async (
  address: string,
  validity: boolean,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Latest Client} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "CLIENT_UPGRADE";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Connection Time Validity Status
export const setConnectionTimeInvalidity = async (
  address: string,
  validity: boolean,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Connection Time} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "CONNECTION_TIME";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Identity Validity Status
export const setIdentityInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Identity} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "IDENTITY";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Identity Validity Status
export const setOfflineAccumulatedInvalidity = async (
  address: string,
  validity: boolean,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Offline Accumulated} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "ACCUMULATED_OFFLINE_TIME";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Identity Validity Status
export const setRewardDestinationInvalidity = async (
  address: string,
  validity: boolean,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Reward Destination} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "REWARD_DESTINATION";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Identity Validity Status
export const setCommissionInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Commission} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "COMMISION";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Self Stake Validity Status
export const setSelfStakeInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "SELF_STAKE";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Unclaimed Era Validity Status
export const setUnclaimedInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "UNCLAIMED_REWARDS";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

// Set Blocked Validity Status
export const setBlockedInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "BLOCKED";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

  try {
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
      },
    ).exec();
  } catch (e) {
    logger.info(`error setting online`);
  }
};

// Set Blocked Validity Status
export const setProviderInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    console.log(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "PROVIDER";
  });
  if (!invalidityReasons || invalidityReasons.length == 0) return;

  try {
    await CandidateModel.findOneAndUpdate(
      {
        stash: address,
      },
      {
        invalidity: [
          ...invalidityReasons,
          {
            valid: validity,
            type: "PROVIDER",
            updated: Date.now(),
            details: validity
              ? ""
              : details
                ? details
                : `${data.name} has banned infrastructure provider`,
          },
        ],
      },
    ).exec();
  } catch (e) {
    logger.info(`error setting provider validity`);
  }
};

// Set Kusama Rank Validity Status
export const setKusamaRankInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    logger.warn(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "KUSAMA_RANK";
  });

  if (!invalidityReasons || invalidityReasons.length == 0) return;

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
    },
  ).exec();
};

export const setBeefyKeysInvalidity = async (
  address: string,
  validity: boolean,
  details?: string,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    logger.warn(`{Self Stake} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  const invalidityReasons = data?.invalidity?.filter((invalidityReason) => {
    return invalidityReason.type !== "BEEFY";
  });

  if (!invalidityReasons || invalidityReasons.length == 0) return;

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: validity,
          type: "BEEFY",
          updated: Date.now(),
          details: validity
            ? ""
            : details
              ? details
              : `${data.name} does not have beefy keys`,
        },
      ],
    },
  ).exec();
};

// Sets valid boolean for node
export const setValid = async (
  address: string,
  validity: boolean,
): Promise<any> => {
  const data = await CandidateModel.findOne({
    stash: address,
  }).lean<Candidate>();

  if (!data || !data?.invalidity) {
    logger.warn(`{Valid} NO CANDIDATE DATA FOUND FOR ${address}`);
    return;
  }

  await CandidateModel.findOneAndUpdate(
    {
      stash: address,
    },
    {
      valid: validity,
    },
  ).exec();
};

export const getUniqueNameSet = async (): Promise<any> => {
  const nameSet = new Set();
  const allNodes = await allCandidates();
  for (const node of allNodes) {
    nameSet.add(node.name);
  }
  return Array.from(nameSet);
};

export const getDuplicatesByName = async (): Promise<any> => {
  const duplicates = [];
  const names = await getUniqueNameSet();
  for (const name of names) {
    const candidates = await CandidateModel.find({ name: name }).exec();
    if (candidates.length > 1) {
      duplicates.push({ name: name, num: candidates.length });
    }
  }
  return duplicates;
};

export const getDuplicatesByStash = async (): Promise<any> => {
  const duplicates = [];
  const stashes = await getUniqueStashSet();
  for (const stash of stashes) {
    const candidates = await CandidateModel.find({ stash: stash }).exec();
    if (candidates.length > 1) {
      duplicates.push({ stash: stash, num: candidates.length });
    }
  }
  return duplicates;
};

export const getUniqueStashSet = async (): Promise<any> => {
  const stashSet = new Set();
  const allNodes = await allCandidates();
  for (const node of allNodes) {
    stashSet.add(node.stash);
  }
  return Array.from(stashSet);
};

export const isKYC = async (stash: string): Promise<boolean | null> => {
  const candidate = await getCandidateByStash(stash);
  if (candidate) {
    return candidate.kyc;
  }
  return null;
};

// Deletes candidates without a `slotId` or `stash` set
export const deleteCandidatesWithMissingFields = async (): Promise<boolean> => {
  try {
    const result = await CandidateModel.deleteMany({
      $or: [
        { stash: { $exists: false } },
        { stash: "" },
        { slotId: { $exists: false } },
      ],
    });

    logger.info(
      `${result.deletedCount} candidates with missing 'stash' or 'slotId' deleted.`,
      dbLabel,
    );
    return true;
  } catch (error) {
    logger.error(`Error deleting candidates with missing fields: ${error}`);
    return false;
  }
};
