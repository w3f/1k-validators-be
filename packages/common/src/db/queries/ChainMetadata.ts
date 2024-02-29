import { ChainMetadata, ChainMetadataModel } from "../models";

export const setChainMetadata = async (
  networkPrefix: number,
): Promise<boolean> => {
  try {
    const networkName =
      networkPrefix === 2
        ? "Kusama"
        : networkPrefix === 0
          ? "Polkadot"
          : "Local Testnet";
    const decimals = networkPrefix === 2 ? 12 : networkPrefix === 0 ? 10 : 12;

    const existingMetadata = await ChainMetadataModel.findOne({
      name: /.*/,
    }).lean();
    if (!existingMetadata) {
      const chainMetadata = new ChainMetadataModel({
        name: networkName,
        decimals: decimals,
      });
      await chainMetadata.save();
      return true;
    } else {
      await ChainMetadataModel.findOneAndUpdate(
        {},
        {
          name: networkName,
          decimals: decimals,
        },
        { new: true },
      );
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getChainMetadata = async (): Promise<ChainMetadata | null> => {
  return ChainMetadataModel.findOne({}).lean<ChainMetadata>();
};
