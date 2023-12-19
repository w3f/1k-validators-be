import { PriceModel } from "../models";

export const setPrice = async (
  network: string,
  date: string,
  chf: number,
  usd: number,
  eur: number
): Promise<boolean> => {
  const data = await PriceModel.findOne({ network, date }).lean();
  if (!data) {
    const price = new PriceModel({
      network,
      date,
      chf,
      usd,
      eur,
    });
    await price.save();
    return true;
  } else {
    await PriceModel.findOneAndUpdate(
      { network, date },
      {
        chf,
        usd,
        eur,
      }
    ).exec();
    return true;
  }
};

export const getPrice = async (network: string, date: string): Promise<any> => {
  return await PriceModel.findOne({ network, date }).lean().exec();
};
