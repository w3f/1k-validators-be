import { Constants, logger, Types } from "../index";
import { constraintsLabel, OTV } from "./constraints";

/// At the end of a nomination round this is the logic that separates the
/// candidates that did good from the ones that did badly.
/// - We have two sets, a 'good' set, and a 'bad' set
///     - We go through all the candidates and if they meet all constraints, they get called to the 'good' set
///     - If they do not meet all the constraints, they get added to the bad set
export const processCandidates = async (
  constraints: OTV,
  candidates: Set<Types.CandidateData>,
): Promise<
  [
    Set<Types.CandidateData>,
    Set<{ candidate: Types.CandidateData; reason: string }>,
  ]
> => {
  logger.info(`Processing ${candidates.size} candidates`, constraintsLabel);

  const good: Set<Types.CandidateData> = new Set();
  const bad: Set<{ candidate: Types.CandidateData; reason: string }> =
    new Set();

  for (const candidate of candidates) {
    if (!candidate) {
      logger.warn(`candidate is null. Skipping processing..`, constraintsLabel);
      continue;
    }
    const { name, stash, skipSelfStake, offlineAccumulated } = candidate;
    /// Ensure the commission wasn't raised/
    const [commission, err] = await constraints.chaindata.getCommission(stash);
    /// If it errors we assume that a validator removed their validator status.
    if (err) {
      const reason = `${name} ${err}`;
      logger.warn(reason, constraintsLabel);
      bad.add({ candidate, reason });
      continue;
    }

    if (commission > constraints.commission) {
      const reason = `${name} found commission higher than ten percent: ${commission}`;
      logger.warn(reason, constraintsLabel);
      bad.add({ candidate, reason });
      continue;
    }

    if (!skipSelfStake) {
      const [bondedAmt, err2] =
        await constraints.chaindata.getBondedAmount(stash);
      if (err2) {
        const reason = `${name} ${err2}`;
        logger.warn(reason, constraintsLabel);
        bad.add({ candidate, reason });
        continue;
      }
      if (bondedAmt < constraints.minSelfStake) {
        const reason = `${name} has less than the minimum required amount bonded: ${bondedAmt}`;
        logger.warn(reason, constraintsLabel);
        bad.add({ candidate, reason });
        continue;
      }
    }

    // Ensure the candidate doesn't have too much offline time
    const totalOffline = offlineAccumulated / Constants.WEEK;
    if (totalOffline > 0.02) {
      const reason = `${name} has been offline ${
        offlineAccumulated / 1000 / 60
      } minutes this week.`;
      logger.info(reason);
      bad.add({ candidate, reason });
      continue;
    }

    good.add(candidate);
  }
  return [good, bad];
};
