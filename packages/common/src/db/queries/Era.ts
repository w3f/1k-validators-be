import { Era, EraModel } from "../models";
import logger from "../../logger";
import { dbLabel } from "../index";

export const setLastNominatedEraIndex = async (
  index: number,
): Promise<boolean> => {
  try {
    const data = await EraModel.findOne({}).lean();
    if (!data) {
      const eraIndex = new EraModel({
        lastNominatedEraIndex: index.toString(),
        when: Date.now(),
      });
      await eraIndex.save();
      return true;
    }

    await EraModel.findOneAndUpdate(
      { lastNominatedEraIndex: /.*/ },
      {
        $set: {
          lastNominatedEraIndex: index.toString(),
          when: Date.now(),
          nextNomination: Date.now() + 86400000,
        },
      },
    ).exec();
    return true;
  } catch (e) {
    logger.error(e, {
      message: "Error setting last nominated era index",
      ...dbLabel,
    });
    return false;
  }
};

export const getLastNominatedEraIndex = async (): Promise<Era | null> => {
  return EraModel.findOne({ lastNominatedEraIndex: /[0-9]+/ }).lean<Era>();
};
