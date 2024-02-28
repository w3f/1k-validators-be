import { DelayedTx, DelayedTxModel } from "../models";

export const addDelayedTx = async (delayedTx: DelayedTx): Promise<boolean> => {
  try {
    const { number, controller, targets, callHash } = delayedTx;
    const tx = new DelayedTxModel({
      number,
      controller,
      targets,
      callHash,
    });
    await tx.save();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getAllDelayedTxs = async (): Promise<DelayedTx[]> => {
  return DelayedTxModel.find({}).lean<DelayedTx[]>();
};

export const deleteDelayedTx = async (
  number: number,
  controller: string,
): Promise<boolean> => {
  try {
    await DelayedTxModel.deleteOne({ number, controller }).exec();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
