import logger from "../../logger";
import { NominationModel } from "../models";

export const setNomination = async (
  address: string,
  era: number,
  targets: string[],
  bonded: number,
  blockHash: string
): Promise<boolean> => {
  logger.info(
    `(Db::setNomination) Setting nomination for ${address} bonded with ${bonded} for era ${era} to the following validators: ${targets}`
  );

  const data = await NominationModel.findOne({
    address: address,
    era: era,
  });

  if (!!data && data.blockHash) return;

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
};

export const getNomination = async (
  address: string,
  era: number
): Promise<any> => {
  const data = await NominationModel.findOne({
    address: address,
    era: era,
  });
  return data;
};

export const getLastNominations = async (
  address: string,
  eras: number
): Promise<any[]> => {
  // Returns the last nominations for a given nominator controller
  const data = await NominationModel.find({ address })
    .sort("-era")
    .limit(Number(eras));
  return data;
};

export const allNominations = async (): Promise<any[]> => {
  return await NominationModel.find({ address: /.*/ }).exec();
};
