import logger from "../../logger";
import { ChainMetadataModel } from "../models";

export const setChainMetadata = async (networkPrefix: number): Promise<any> => {
  const networkName =
    networkPrefix == 2
      ? "Kusama"
      : networkPrefix == 0
      ? "Polkadot"
      : "Local Testnet";
  const decimals = networkPrefix == 2 ? 12 : networkPrefix == 0 ? 10 : 12;

  logger.info(
    `(Db::setChainMetadata) Setting chain metadata: ${networkName} with ${decimals} decimals`
  );

  const data = await ChainMetadataModel.findOne({ name: /.*/ }).lean();
  if (!data) {
    const chainMetadata = new ChainMetadataModel({
      name: networkName,
      decimals: decimals,
    });
    return chainMetadata.save();
  }

  ChainMetadataModel.findOneAndUpdate({
    name: networkName,
    decimals: decimals,
  });
};

export const getChainMetadata = async (): Promise<any> => {
  return ChainMetadataModel.findOne({ name: /.*/ }).lean().exec();
};
