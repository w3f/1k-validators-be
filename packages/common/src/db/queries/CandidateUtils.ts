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
  return (
    candidate?.invalidity?.filter(
      (invalidityReason) => invalidityReason.type !== filter,
    ) || []
  );
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
