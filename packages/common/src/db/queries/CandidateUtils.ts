import {
  Candidate,
  CandidateModel,
  InvalidityReason,
  InvalidityReasonType,
} from "../models";

export const filterCandidateInvalidityFields = (
  candidate: Candidate,
  filter: InvalidityReasonType,
): InvalidityReason[] => {
  if (!candidate || !candidate?.invalidity)
    throw new Error(
      `NO CANDIDATE DATA FOUND FOR CANDIDATE with slotId ${candidate.slotId}`,
    );

  const invalidityReasons = candidate?.invalidity?.filter(
    (invalidityReason) => {
      return invalidityReason.type !== filter;
    },
  );

  return invalidityReasons;
};

export const setCandidateInvalidity = async (
  candidate: Candidate,
  invalidityType: InvalidityReasonType,
  isValid: boolean,
  invalidityMessage = "",
) => {
  const invalidityReasons = filterCandidateInvalidityFields(
    candidate,
    invalidityType,
  );

  await CandidateModel.findOneAndUpdate(
    {
      slotId: candidate.slotId,
    },
    {
      invalidity: [
        ...invalidityReasons,
        {
          valid: isValid,
          type: invalidityType,
          updated: Date.now(),
          details: isValid ? "" : `${invalidityMessage}`,
        },
      ],
    },
  ).exec();
};
