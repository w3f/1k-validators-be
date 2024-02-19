import { queries } from "@1kv/common";

export const getNominators = async (): Promise<any> => {
  let allNominators = await queries.allNominators();
  allNominators = allNominators.sort((a, b) => a.avgStake - b.avgStake);
  return allNominators.map(async (nominator) => {
    const lastNomination = await queries.getLastNominatorNomination(
      nominator.address,
    );
    return {
      address: nominator.address,
      stash: nominator.stash,
      proxy: nominator.proxy,
      bonded: nominator.bonded,
      proxyDelay: nominator.proxyDelay,
      rewardDestination: nominator.rewardDestination,
      avgStake: nominator.avgStake,
      nominateAmount: nominator.nominateAmount,
      newBondedAmount: nominator.newBondedAmount,
      current: nominator.current,
      lastNomination: lastNomination?.validators,
      createdAt: nominator.createdAt,
    };
  });
};

export const getNominator = async (stash): Promise<any> => {
  const nominator = await queries.getNominator(stash);
  return nominator;
};
