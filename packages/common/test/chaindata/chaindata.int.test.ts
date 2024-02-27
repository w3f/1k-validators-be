import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { ChainData } from "../../src/chaindata/chaindata";
import { KusamaEndpoints } from "../../src/constants";
import { Block } from "@polkadot/types/interfaces";

const TIMEOUT_DURATION = 1200000; // 120 seconds
describe("ChainData Integration Tests", () => {
  let apiHandler: ApiHandler;
  let chainData: ChainData;

  beforeAll(async () => {
    apiHandler = new ApiHandler(KusamaEndpoints);
    await apiHandler.setAPI();
    chainData = new ChainData(apiHandler);
  }, TIMEOUT_DURATION);

  afterAll(async () => {
    await apiHandler.getApi()?.disconnect();
  }, TIMEOUT_DURATION);

  it(
    "should check API connection",
    async () => {
      await chainData.checkApiConnection();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch chain type",
    async () => {
      const chainType: string | null = await chainData.getChainType();
      expect(chainType).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch denomination",
    async () => {
      const denom: number | null = await chainData.getDenom();
      expect(denom).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch latest block number",
    async () => {
      const latestBlock: number | null = await chainData.getLatestBlock();
      expect(latestBlock).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch block hash",
    async () => {
      let blockHash;
      const latestBlock: number | null = await chainData.getLatestBlock();
      if (latestBlock) {
        blockHash = await chainData.getBlockHash(latestBlock);
      }

      expect(blockHash).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch block details",
    async () => {
      let block: Block | null = null;
      const latestBlock: number | null = await chainData.getLatestBlock();
      if (latestBlock) {
        block = await chainData.getBlock(latestBlock);
      }

      expect(block).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch latest block hash",
    async () => {
      const latestBlockHash: string | null =
        await chainData.getLatestBlockHash();
      expect(latestBlockHash).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch session number",
    async () => {
      const session: number | null = await chainData.getSession();
      expect(session).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch active era index",
    async () => {
      const activeEra = await chainData.getActiveEraIndex();
      expect(activeEra).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch current era",
    async () => {
      const currentEra: number | null = await chainData.getCurrentEra();
      expect(currentEra).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch session at era",
    async () => {
      const activeEra = await chainData.getActiveEraIndex();
      const sessionAtEra = await chainData.getSessionAtEra(activeEra[0] | 0);
      expect(sessionAtEra).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch total era points",
    async () => {
      const activeEra = await chainData.getActiveEraIndex();
      const totalEraPoints = await chainData.getTotalEraPoints(
        activeEra[0] | 0,
      );
      expect(totalEraPoints).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should find era block hash",
    async () => {
      let findEraBlockHash;
      const activeEra = await chainData.getActiveEraIndex();
      const chainType: string | null = await chainData.getChainType();
      if (chainType) {
        findEraBlockHash = await chainData.findEraBlockHash(
          activeEra[0] - 5,
          chainType,
        );
      }

      expect(findEraBlockHash).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch current validators",
    async () => {
      const currentValidators = await chainData.currentValidators();
      expect(currentValidators).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch validator commission",
    async () => {
      let getCommission;
      const currentValidators = await chainData.currentValidators();
      if (currentValidators) {
        getCommission = await chainData.getCommission(currentValidators[0]);
      }

      expect(getCommission).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch validator blocked status",
    async () => {
      let getBlocked;
      const currentValidators = await chainData.currentValidators();
      if (currentValidators) {
        getBlocked = await chainData.getBlocked(currentValidators[0]);
      }
      expect(getBlocked).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch bonded amount",
    async () => {
      let getBondedAmount;
      const currentValidators = await chainData.currentValidators();
      if (currentValidators) {
        getBondedAmount = await chainData.getBondedAmount(currentValidators[0]);
      }

      expect(getBondedAmount).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch controller from stash",
    async () => {
      let getControllerFromStash;
      const currentValidators = await chainData.currentValidators();
      if (currentValidators) {
        getControllerFromStash = await chainData.getControllerFromStash(
          currentValidators[0],
        );
      }
      expect(getControllerFromStash).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch reward destination",
    async () => {
      const currentValidators = await chainData.currentValidators();
      const getRewardDestination = await chainData.getRewardDestination(
        currentValidators[0],
      );
      expect(getRewardDestination).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch queued keys",
    async () => {
      const queuedKeys = await chainData.getQueuedKeys();
      expect(queuedKeys).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch next keys",
    async () => {
      const nextKeys = await chainData.getNextKeys(
        "EXGbhMrQubm7pRkUSkTEGi2rmR764ZM7kStfCRo2cZYa8VE",
      );
      expect(nextKeys).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch balance",
    async () => {
      const currentValidators = await chainData.currentValidators();
      const validator = currentValidators[0] || "";
      const balance = await chainData.getBalance(validator);
      expect(balance).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch exposure",
    async () => {
      const activeEra = await chainData.getActiveEraIndex();
      const currentValidators = await chainData.currentValidators();
      const exposure = await chainData.getExposure(
        activeEra[0],
        currentValidators[0],
      );
      expect(exposure).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch active validators in period",
    async () => {
      let activeValidatorsInPeriod;
      const activeEra = (await chainData.getActiveEraIndex()) || 0;
      const chainType: string | null = await chainData.getChainType();
      if (chainType) {
        activeValidatorsInPeriod = await chainData.activeValidatorsInPeriod(
          activeEra[0] - 5,
          activeEra[0],
          chainType,
        );
      }

      expect(activeValidatorsInPeriod).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch validators at era",
    async () => {
      let validatorsAtEra;
      const activeEra = await chainData.getActiveEraIndex();
      if (activeEra) {
        validatorsAtEra = await chainData.getValidatorsAtEra(activeEra[0] - 5);
      }

      expect(validatorsAtEra).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch validators",
    async () => {
      const validators = await chainData.getValidators();
      expect(validators).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should check for identity",
    async () => {
      let hasIdentity;
      const validators = await chainData.getValidators();
      if (validators) {
        hasIdentity = await chainData.hasIdentity(validators[0]);
      }

      expect(hasIdentity).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch identity",
    async () => {
      const getIdentity = await chainData.getIdentity(
        "J4hAvZoHCviZSoPHoSwLida8cEkZR1NXJcGrcfx9saHTk7D",
      );
      expect(getIdentity).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch formatted identity",
    async () => {
      const identity = await chainData.getFormattedIdentity(
        "J4hAvZoHCviZSoPHoSwLida8cEkZR1NXJcGrcfx9saHTk7D",
      );
      expect(identity).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch proxy announcements",
    async () => {
      let proxyAnnouncements;
      const validators = await chainData.getValidators();
      if (validators) {
        proxyAnnouncements = await chainData.getProxyAnnouncements(
          validators[0],
        );
      }

      expect(proxyAnnouncements).toBeDefined();
    },
    TIMEOUT_DURATION,
  );

  it(
    "should fetch nominators",
    async () => {
      const nominators = await chainData.getNominators();
      expect(nominators).toBeDefined();
    },
    TIMEOUT_DURATION * 4,
  );
});
