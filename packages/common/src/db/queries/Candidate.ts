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
import {
  isCandidateInvaliditySet,
  setCandidateInvalidity,
} from "./CandidateUtils";

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

export const setLastValid = async (candidate: Candidate): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { slotId: candidate.slotId },
    { lastValid: Date.now() },
  ).exec();
  return true;
};

export const setCommission = async (
  candidate: Candidate,
  commission: number,
): Promise<boolean> => {
  await CandidateModel.findOneAndUpdate(
    { slotId: candidate.slotId },
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
  candidate: Candidate,
  inclusion: number,
): Promise<boolean> => {
  logger.debug(
    `(Db::setInclusion) Setting ${candidate.stash} inclusion to ${inclusion}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      $set: { inclusion: inclusion },
    },
  ).exec();
  return true;
};

export const setSpanInclusion = async (
  candidate: Candidate,
  spanInclusion: number,
): Promise<boolean> => {
  logger.debug(
    `(Db::setInclusion) Setting ${candidate.stash} span inclusion to ${spanInclusion}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      $set: { spanInclusion: spanInclusion },
    },
  ).exec();
  return true;
};

export const setBonded = async (
  candidate: Candidate,
  bonded: number,
): Promise<boolean> => {
  logger.debug(
    `(Db::setBonded) Setting ${candidate.stash} bonded to ${bonded}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      $set: { bonded: bonded },
    },
  ).exec();
  return true;
};

export const setRewardDestination = async (
  candidate: Candidate,
  rewardDestination: string,
): Promise<boolean> => {
  logger.debug(
    `(Db::setRewardDestination) Setting ${candidate.stash} reward destination to ${rewardDestination}.`,
  );

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      $set: { rewardDestination: rewardDestination },
    },
  ).exec();
  return true;
};

//TODO: remove it, it seems not used
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
  candidate: Candidate,
  era: number,
): Promise<any> => {
  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
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
  candidate: Candidate,
  isValid: boolean,
): Promise<void> => {
  const invalidityMessage = `${candidate.name} does not have a validate intention.`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.VALIDATE_INTENTION,
    isValid,
    invalidityMessage,
  );
};

// Set Client Version Validity Status
export const setLatestClientReleaseValidity = async (
  candidate: Candidate,
  isValid: boolean,
): Promise<void> => {
  const invalidityMessage = `${candidate.name} is not on the latest client version`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.CLIENT_UPGRADE,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Connection Time Validity Status
export const setConnectionTimeInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
): Promise<void> => {
  const invalidityMessage = `${candidate.name} has not been connected for minimum length`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.CONNECTION_TIME,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Identity Validity Status
export const setIdentityInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} has not properly set their identity`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.IDENTITY,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Identity Validity Status
export const setOfflineAccumulatedInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
): Promise<void> => {
  const invalidityMessage = `${candidate.name} has been offline ${candidate.offlineAccumulated / 1000 / 60} minutes this week.`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.ACCUMULATED_OFFLINE_TIME,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Identity Validity Status
// TODO: check why it is not called by anybody. Not needed anymore ?
export const setRewardDestinationInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
): Promise<void> => {
  const invalidityMessage = `${candidate.name} does not have reward destination as Staked`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.REWARD_DESTINATION,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Identity Validity Status
export const setCommissionInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} has not properly set their commission`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.COMMISION,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Self Stake Validity Status
export const setSelfStakeInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} has not properly bonded enough self stake`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.SELF_STAKE,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Unclaimed Era Validity Status
export const setUnclaimedInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} has not properly claimed era rewards`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.UNCLAIMED_REWARDS,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Blocked Validity Status
export const setBlockedInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} blocks external nominations`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.BLOCKED,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Blocked Validity Status
export const setProviderInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} has banned infrastructure provider`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.PROVIDER,
    isValid,
    invalidityMessage,
    true,
  );
};

// Set Kusama Rank Validity Status
export const setKusamaRankInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} has not properly claimed era rewards`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.KUSAMA_RANK,
    isValid,
    invalidityMessage,
    true,
  );
};

export const setBeefyKeysInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message
    ? message
    : `${candidate.name} does not have beefy keys`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.BEEFY,
    isValid,
    invalidityMessage,
    true,
  );
};

export const setKYCInvalidity = async (
  candidate: Candidate,
  isValid: boolean,
  message?: string,
): Promise<void> => {
  const invalidityMessage = message ? message : `${candidate.name} is not KYC`;
  setCandidateInvalidity(
    candidate,
    InvalidityReasonType.KYC,
    isValid,
    invalidityMessage,
    true,
  );
};

// Sets valid boolean for node
export const setValid = async (
  candidate: Candidate,
  isValid: boolean,
): Promise<void> => {
  if (!isCandidateInvaliditySet(candidate)) return;

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      valid: isValid,
    },
  ).exec();
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

export const isKYC = async (stash: string): Promise<boolean | null> => {
  const candidate = await getCandidateByStash(stash);
  if (candidate) {
    return candidate.kyc;
  }
  return null;
};
