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
  skipIfNoData = false, //TODO: understand if it's needed or not, for now it just doesn't break the current logic
) => {
  const invalidityReasons = filterCandidateInvalidityFields(
    candidate,
    invalidityType,
  );

  if (skipIfNoData && invalidityReasons.length == 0) return;

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
