import logger from "../../logger";
import { AccountingModel } from "../models";

/**
 * Creates a new accounting record if none exists.
 * @param stash
 * @param controller
 */
export const newAccountingRecord = async (
  stash: string,
  controller: string
): Promise<boolean> => {
  logger.info(
    `(Db::newAccountingRecord) Adding stash ${stash} and controller ${controller}`
  );

  const record = await AccountingModel.findOne({ stash, controller });
  if (!record) {
    const accounting = new AccountingModel({
      stash,
      controller,
      total: "0",
      records: [],
    });
    await accounting.save();
    return true;
  }

  return true;
};

export const updateAccountingRecord = async (
  controller: string,
  stash: string,
  era: string,
  reward: string
): Promise<boolean> => {
  logger.info(
    `(Db::updateAccountingRecord) Adding era ${era} and reward ${reward}`
  );

  const record = await AccountingModel.findOne({ stash, controller });
  if (!record) {
    // record doesn't exist just return false
    return false;
  }

  await AccountingModel.findOneAndUpdate(
    {
      stash,
      controller,
    },
    {
      $push: { records: { era, reward } },
    }
  ).exec();

  return true;
};

export const getAccounting = async (
  controllerOrStash: string
): Promise<any> => {
  const stashResult = await AccountingModel.findOne({
    stash: controllerOrStash,
  }).exec();

  if (stashResult) {
    return stashResult;
  }

  const controllerResult = await AccountingModel.findOne({
    controller: controllerOrStash,
  }).exec();

  if (controllerResult) {
    return controllerResult;
  }

  return null;
};
