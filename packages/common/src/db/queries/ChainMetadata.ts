import { ChainMetadata, ChainMetadataModel } from "../models";

export const setChainMetadata = async (
  networkPrefix: number,
): Promise<boolean> => {
  try {
    let networkName = "Local Testnet";
    let decimals = 12;
    switch (networkPrefix) {
      case 0:
        networkName = "Polkadot";
        decimals = 10;
        break;
      case 2:
        networkName = "Kusama";
        break;
      case 12850:
        networkName = "Analog Testnet";
        break;
    }

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
