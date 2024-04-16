import logger from "../../logger";
import {
  Candidate,
  CandidateModel,
  InvalidityReason,
  InvalidityReasonType,
} from "../models";
import { allCandidates } from "./Candidate";

export const filterCandidateInvalidityFields = (
  candidate: Candidate,
  filter: InvalidityReasonType,
): InvalidityReason[] => {
  return (
    candidate?.invalidity?.filter(
      (invalidityReason) => invalidityReason.type !== filter,
    ) || []
  );
};

export const isCandidateInvaliditySet = (candidate: Candidate): boolean => {
  if (!candidate.invalidity?.length) {
    logger.warn(`No Candidate Invalidity data found for ${candidate.name}`);
    return false;
  }
  return true;
};

export const setCandidateInvalidity = async (
  candidate: Candidate,
  invalidityType: InvalidityReasonType,
  isValid: boolean,
  invalidityMessage = "",
  skipIfNoData = false, //TODO: understand if it's needed or not. Will says not necessary anymore, to be double checked. For now it maintains the previus behaviour.
) => {
  if (skipIfNoData && !isCandidateInvaliditySet(candidate)) return;

  const invalidityReason: InvalidityReason = {
    valid: isValid,
    type: invalidityType,
    updated: Date.now(),
    details: isValid ? "" : `${invalidityMessage}`,
  };

  await CandidateModel.updateOne(
    {
      slotId: candidate.slotId,
      "invalidity.type": invalidityType,
    },
    {
      $set: {
        "invalidity.$": invalidityReason,
      },
    },
  ).exec();

  await CandidateModel.updateOne(
    {
      slotId: candidate.slotId,
      "invalidity.type": { $ne: invalidityType },
    },
    {
      $push: {
        invalidity: invalidityReason,
      },
    },
  ).exec();
};

export const getUniqueNameSet = async (): Promise<string[]> => {
  const nameSet = new Set<string>();
  const allNodes = await allCandidates();
  for (const node of allNodes) {
    nameSet.add(node.name);
  }
  return Array.from(nameSet);
};

export const getDuplicatesByName = async (): Promise<
  Array<{ name: string; num: number }>
> => {
  const duplicates: Array<{ name: string; num: number }> = [];
  const names = await getUniqueNameSet();
  for (const name of names) {
    const candidates = await CandidateModel.find({ name: name }).exec();
    if (candidates.length > 1) {
      duplicates.push({ name: name, num: candidates.length });
    }
  }
  return duplicates;
};

export const getDuplicatesByStash = async (): Promise<
  Array<{ stash: string; num: number }>
> => {
  const duplicates: Array<{ stash: string; num: number }> = [];
  const stashes = await getUniqueStashSet();
  for (const stash of stashes) {
    const candidates = await CandidateModel.find({ stash: stash }).exec();
    if (candidates.length > 1) {
      duplicates.push({ stash: stash, num: candidates.length });
    }
  }
  return duplicates;
};

export const getUniqueStashSet = async (): Promise<string[]> => {
  const stashSet = new Set<string>();
  const allNodes = await allCandidates();
  for (const node of allNodes) {
    stashSet.add(node.stash);
  }
  return Array.from(stashSet);
};
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
