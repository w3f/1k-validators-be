// Updates information on a council member
import { CouncillorModel } from "../models";

export const setCouncillor = async (
  address: string,
  membershipStatus: string,
  backing: number
): Promise<any> => {
  // Try and find an existing record
  const data = await CouncillorModel.findOne({
    address,
  }).lean();

  // if the data is the same, return
  if (!!data && data.backing == backing && data.status == membershipStatus)
    return;

  // If councillor info doesn't yet exist
  if (!data) {
    const councillor = new CouncillorModel({
      address,
      status: membershipStatus,
      backing,
      updated: Date.now(),
    });
    return councillor.save();
  }

  // It exists, but has a different value - update it
  CouncillorModel.findOneAndUpdate(
    {
      address,
    },
    {
      status: membershipStatus,
      backing,
      updated: Date.now(),
    }
  );
};

// returns a single council member by their address
export const getCouncillor = async (address: string): Promise<any> => {
  const data = await CouncillorModel.findOne({
    address,
  }).lean();
  return data;
};

// return all council members
export const getAllCouncillors = async (): Promise<any> => {
  return CouncillorModel.find({}).lean();
};
