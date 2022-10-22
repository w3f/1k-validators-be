// Writes an election stats record in the db
import { ElectionStatsModel } from "../models";

export const setElectionStats = async (
  termDuration: number,
  candidacyBond: number,
  totalMembers: number,
  totalRunnersUp: number,
  totalCandidates: number,
  totalVoters: number,
  totalBonded: number,
  session: number
): Promise<any> => {
  // Try and find an existing record
  const data = await ElectionStatsModel.findOne({
    session,
  });

  // If election stats for that session doesnt yet exist
  if (!data) {
    const electionStats = new ElectionStatsModel({
      termDuration,
      candidacyBond,
      totalMembers,
      totalRunnersUp,
      totalCandidates,
      totalVoters,
      totalBonded,
      session,
      updated: Date.now(),
    });
    return electionStats.save();
  }

  // It exists, but has a different value - update it
  await ElectionStatsModel.findOneAndUpdate(
    {
      session,
    },
    {
      termDuration,
      candidacyBond,
      totalMembers,
      totalRunnersUp,
      totalCandidates,
      totalVoters,
      totalBonded,
      updated: Date.now(),
    }
  ).exec();
};

// Retrieves the last election stats record (by the time it was updated)
export const getLatestElectionStats = async (): Promise<any> => {
  return (await ElectionStatsModel.find({}).sort("-updated").limit(1))[0];
};
