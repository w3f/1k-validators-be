import ApiHandler from "../../src/ApiHandler"; // Update the path as necessary
import { ChainData } from "../../src/chaindata/chaindata";
import { KusamaEndpoints } from "../../src/constants";
import { NumberResult, StringResult } from "../../src/types";
import { EraPointsInfo } from "../../src/chaindata/queries/Era";
import {
  Balance,
  Exposure,
  NextKeys,
  QueuedKey,
} from "../../src/chaindata/queries/ValidatorPref";
import { Identity } from "../../src/db/models";
import { ProxyAnnouncement } from "../../src/chaindata/queries/Proxy";
import { NominatorInfo } from "../../src/chaindata/queries/Nomination";
import { Block } from "@polkadot/types/interfaces";

describe("ChainData Integration Tests", () => {
  let apiHandler: ApiHandler;
  let chainData: ChainData;

  beforeAll(async () => {
    apiHandler = new ApiHandler(KusamaEndpoints);
    await apiHandler.setAPI();
    chainData = new ChainData(apiHandler);
  });

  afterAll(async () => {
    await apiHandler.getApi().disconnect();
  });

  it("should fetch and log chain data", async () => {
    await chainData.checkApiConnection();

    const chainType: string = await chainData.getChainType();
    console.log("Chain Type:", JSON.stringify(chainType));

    const denom: number = await chainData.getDenom();
    console.log("Denomination:", JSON.stringify(denom));

    const latestBlock: number = await chainData.getLatestBlock();
    console.log("Latest Block:", JSON.stringify(latestBlock));

    const blockHash: string = await chainData.getBlockHash(latestBlock);
    console.log("Block Hash:", JSON.stringify(blockHash));

    const block: Block | undefined = await chainData.getBlock(latestBlock);
    console.log("Block:", JSON.stringify(block));

    const latestBlockHash: string = await chainData.getLatestBlockHash();
    console.log("Latest Block Hash:", JSON.stringify(latestBlockHash));

    const session: number = await chainData.getSession();
    console.log("Session:", JSON.stringify(session));

    const activeEra: NumberResult = await chainData.getActiveEraIndex();
    console.log("Active Era:", JSON.stringify(activeEra));

    const currentEra: number = await chainData.getCurrentEra();
    console.log("Current Era:", JSON.stringify(currentEra));

    const sessionAtEra = await chainData.getSessionAtEra(activeEra[0]);
    console.log("Session at Era:", JSON.stringify(sessionAtEra));

    const totalEraPoints: EraPointsInfo = await chainData.getTotalEraPoints(
      activeEra[0],
    );
    console.log("Total Era Points:", JSON.stringify(totalEraPoints));

    const findEraBlockHash: StringResult = await chainData.findEraBlockHash(
      activeEra[0] - 5,
      chainType,
    );
    console.log("Find Era Block Hash:", JSON.stringify(findEraBlockHash));

    const currentValidators: string[] = await chainData.currentValidators();
    console.log("Current Validators:", JSON.stringify(currentValidators));

    const validatorExample = currentValidators[0];

    const getCommission: NumberResult =
      await chainData.getCommission(validatorExample);
    console.log("Get Commission:", JSON.stringify(getCommission));

    const getBlocked: boolean = await chainData.getBlocked(validatorExample);
    console.log("Get Blocked:", JSON.stringify(getBlocked));

    const getBondedAmount: NumberResult =
      await chainData.getBondedAmount(validatorExample);
    console.log("Get Bonded Amount:", JSON.stringify(getBondedAmount));

    const getControllerFromStash: string =
      await chainData.getControllerFromStash(validatorExample);
    console.log(
      "Get Controller From Stash:",
      JSON.stringify(getControllerFromStash),
    );

    const getRewardDestination: string =
      await chainData.getRewardDestination(validatorExample);
    console.log(
      "Get Reward Destination:",
      JSON.stringify(getRewardDestination),
    );

    const queuedKeys: QueuedKey[] = await chainData.getQueuedKeys();
    console.log("Queued Keys:", JSON.stringify(queuedKeys));

    const nextKeys: NextKeys | undefined =
      await chainData.getNextKeys(validatorExample);
    console.log("Next Keys:", JSON.stringify(nextKeys));

    const balance: Balance = await chainData.getBalance(validatorExample);
    console.log("Balance:", JSON.stringify(balance));

    const exposure: Exposure = await chainData.getExposure(
      activeEra[0],
      validatorExample,
    );
    console.log("Exposure:", JSON.stringify(exposure));

    const activeValidatorsInPeriod: [string[] | null, string | null] =
      await chainData.activeValidatorsInPeriod(
        activeEra[0] - 5,
        activeEra[0],
        chainType,
      );
    console.log(
      "Active Validators In Period:",
      JSON.stringify(activeValidatorsInPeriod),
    );

    const validatorsAtEra: string[] = await chainData.getValidatorsAtEra(
      activeEra[0] - 5,
    );
    console.log("Validators At Era:", JSON.stringify(validatorsAtEra));

    const validators: string[] = await chainData.getValidators();
    console.log("Validators:", JSON.stringify(validators));

    const hasIdentity: [boolean, boolean] = await chainData.hasIdentity(
      validators[0],
    );
    console.log("Has Identity:", JSON.stringify(hasIdentity));

    const getIdentity: string | null = await chainData.getIdentity(
      validators[0],
    );
    console.log("Get Identity:", JSON.stringify(getIdentity));

    const identity: Identity = await chainData.getFormattedIdentity(
      validators[0],
    );
    console.log("Identity:", JSON.stringify(identity));

    const proxyAnnouncements: ProxyAnnouncement[] =
      await chainData.getProxyAnnouncements(validators[0]);
    console.log("Proxy Announcements:", JSON.stringify(proxyAnnouncements));

    const nominators: NominatorInfo[] = await chainData.getNominators();
    console.log("Nominators:", JSON.stringify(nominators));

    const data = {
      chainType,
      denom,
      latestBlock,
      blockHash,
      block,
      latestBlockHash,
      session,
      activeEra,
      currentEra,
      sessionAtEra,
      totalEraPoints,
      findEraBlockHash,
      currentValidators,
      getCommission,
      getBlocked,
      getBondedAmount,
      getControllerFromStash,
      getRewardDestination,
      queuedKeys,
      nextKeys,
      balance,
      exposure,
      activeValidatorsInPeriod,
      validatorsAtEra,
      validators,
      hasIdentity,
      getIdentity,
      identity,
      proxyAnnouncements,
      nominators,
    };

    const fs = require("fs");

    // Convert data to JSON
    const jsonData = JSON.stringify(data, null, 2);

    // Write JSON data to a file
    fs.writeFileSync("./data/chaindata/kusamaMockValues.json", jsonData);

    // Example typed assertion
    expect(chainType).toBeDefined();
    expect(chainType).toBe("Kusama"); // Example, replace with actual expected value
  }, 3000000);
});
