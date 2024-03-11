import { addCandidate, setChainMetadata } from "../../src/db/queries";

export const kusamaCandidates = [
  {
    slotId: 0,
    name: "Blockshard",
    stash: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
    riotHandle: "@marc1104:matrix.org",
    kyc: false,
  },
  {
    slotId: 1,
    name: "🎠 Forbole GP01 🇭🇰",
    stash: "D9rwRxuG8xm8TZf5tgkbPxhhTJK5frCJU9wvp59VRjcMkUf",
    riotHandle: "@kwunyeung:matrix.org",
    kyc: false,
  },
  {
    slotId: 2,
    name: "🔱-Masternode24-🔱",
    stash: "FyRaMYvPqpNGq6PFGCcUWcJJWKgEz29ZFbdsnoNAczC2wJZ",
    riotHandle: "@alexkidd:matrix.org",
    kyc: false,
  },
  {
    slotId: 3,
    name: "🔱-Masternode25-🔱",
    stash: "FNztLLstrnThEEctuH2C9Kw1d73xVVxm2crji2mkb4ioXsn",
    riotHandle: "@alexkidd:matrix.org",
    kyc: false,
  },
  {
    slotId: 4,
    name: "Anonstake",
    stash: "J4hAvZoHCviZSoPHoSwLida8cEkZR1NXJcGrcfx9saHTk7D",
    riotHandle: "@anon2020:matrix.org",
    kyc: false,
  },
  {
    slotId: 5,
    name: "Indigo One",
    stash: "EPhtbjecJ9P2SQEGEJ4XmFS4xN7JioBFarSrbqjhj8BuJ2v",
    riotHandle: "@shadewolf:matrix.org",
    kyc: false,
  },
  {
    slotId: 6,
    name: "KIRA Staking",
    stash: "HhcrzHdB5iBx823XNfBUukjj4TUGzS9oXS8brwLm4ovMuVp",
    riotHandle: "@asmodat:matrix.org",
    kyc: false,
  },
  {
    slotId: 7,
    name: "Staker Space [1]",
    stash: "FcjmeNzPk3vgdENm1rHeiMCxFK96beUoi2kb59FmCoZtkGF",
    riotHandle: "@gnossienli:matrix.org",
    kyc: false,
  },
];

export const polkadotCandidates = [
  {
    slotId: 0,
    name: "specialized-tarmac-3",
    stash: "12bWp3rifCRrJzrTSPe1BrDaFxCLMVCUit6t21K986ZeeNJm",
    kusamaStash: "HngUT2inDFPBwiey6ZdqhhnmPKHkXayRpWw9rFj55reAqvi",
    riotHandle: "@joe:web3.foundation",
    kyc: false,
  },
  {
    slotId: 1,
    name: "🔒stateless_money🔒 / 1",
    stash: "14Vh8S1DzzycngbAB9vqEgPFR9JpSvmF1ezihTUES1EaHAV",
    kusamaStash: "HZvvFHgPdhDr6DHN43xT1sP5fDyzLDFv5t5xwmXBrm6dusm",
    riotHandle: "@aaronschwarz:matrix.org",
    kyc: false,
  },
  {
    slotId: 2,
    name: "KeepNode-Carbon",
    stash: "13BeUcLu7hzSTaoKpEtpdqiXKZz6yVfT9exKH6JuTW8RQQvJ",
    kusamaStash: "FDDy3cQa7JXiChYU2xq1B2WUUJBpZpZ51qn2tiN1DqDMEpS",
    riotHandle: "@Drun:matrix.org",
    kyc: false,
  },
  {
    slotId: 3,
    name: "🔱-Masternode24-🔱",
    stash: "14Q74NU7dG4uxiHTSCSZii5T1Y368cm7BNVNeRWmEuoDUGXQ",
    kusamaStash: "FyRaMYvPqpNGq6PFGCcUWcJJWKgEz29ZFbdsnoNAczC2wJZ",
    riotHandle: "@alexkidd:matrix.org",
    kyc: false,
  },
  {
    slotId: 4,
    name: "Genesis Lab",
    stash: "13K6QTYBPMUFTbhZzqToKcfCiWbt4wDPHr3rUPyUessiPR61",
    kusamaStash: "DuRV4MSm54UoX3MpFe3P7rxjBFLfnKRThxG66s4n3yF8qbJ",
    riotHandle: [
      "@i7495:matrix.org",
      "@black_rock:matrix.org",
      "@pvdmitriy:matrix.org",
    ],
    kyc: false,
  },
];

export const addKusamaCandidates = async (): Promise<boolean> => {
  try {
    await setChainMetadata(2);
    for (const candidate of kusamaCandidates) {
      await addCandidate(
        candidate.slotId,
        candidate.name,
        candidate.stash,
        "",
        false,
        candidate.riotHandle,
        candidate.kyc,
      );
    }
    return true;
  } catch (error) {
    console.error("Error adding Kusama candidates", error);
    return false;
  }
};

export const addPolkadotCandidates = async () => {
  await setChainMetadata(0);
  for (const candidate of polkadotCandidates) {
    await addCandidate(
      candidate.slotId,
      candidate.name,
      candidate.stash,
      candidate.kusamaStash,
      false,
      candidate.riotHandle,
      candidate.kyc,
    );
  }
};
