import { Nomination, NominationModel } from "../models";

export const setNomination = async (
  address: string,
  era: number,
  targets: string[],
  bonded: number,
  blockHash: string,
): Promise<boolean> => {
  try {
    const data = await NominationModel.findOne({
      address: address,
      era: era,
    }).lean();

    if (!!data && data.blockHash) return false;

    if (!data) {
      const nomination = new NominationModel({
        address: address,
        era: era,
        validators: targets,
        timestamp: Date.now(),
        bonded: bonded,
        blockHash: blockHash,
      });
      await nomination.save();
      return true;
    }

    await NominationModel.findOneAndUpdate({
      address: address,
      era: era,
      validators: targets,
      timestamp: Date.now(),
      bonded: bonded,
      blockHash: blockHash,
    }).exec();
    return true;
  } catch (e) {
    console.error(`Error setting nomination: ${JSON.stringify(e)}`);
    return false;
  }
};

export const getNomination = async (
  address: string,
  era: number,
): Promise<Nomination | null> => {
  return NominationModel.findOne({
    address: address,
    era: era,
  }).lean<Nomination>();
};

export const getLastNominatorNomination = async (
  address: string,
): Promise<Nomination | null> => {
  // Returns the last nominations for a given nominator controller
  const data = await NominationModel.findOne({ address })
    .lean<Nomination[]>()
    .sort("-timestamp")
    .limit(1);
  if (data) {
    return data[0];
  } else {
    return null;
  }
};

export const getLastNominations = async (
  address: string,
  eras: number,
): Promise<Nomination[]> => {
  // Returns the last nominations for a given nominator controller
  return NominationModel.find({ address })
    .lean<Nomination[]>()
    .sort("-era")
    .limit(Number(eras));
};

export const allNominations = async (): Promise<Nomination[]> => {
  return NominationModel.find({}).lean<Nomination[]>();
};
