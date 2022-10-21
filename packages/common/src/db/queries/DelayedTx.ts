import { DelayedTxModel } from "../models";

export const addDelayedTx = async (
  number: number,
  controller: string,
  targets: string[],
  callHash: string
): Promise<boolean> => {
  const delayedTx = new DelayedTxModel({
    number,
    controller,
    targets,
    callHash,
  });
  await delayedTx.save();
  return true;
};

export const getAllDelayedTxs = async (): Promise<any[]> => {
  return DelayedTxModel.find({ controller: /.*/ }).exec();
};

export const deleteDelayedTx = async (
  number: number,
  controller: string
): Promise<boolean> => {
  await DelayedTxModel.deleteOne({ number, controller }).exec();
  return true;
};
