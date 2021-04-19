import { Keyring } from "@polkadot/api";
import ApiHandler from "./ApiHandler";
import { ClaimerConfig, EraReward, Stash } from "./types";
import Database from "./db";
import { KeyringPair } from "@polkadot/keyring/types";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import logger from "./logger";
import { sleep } from "./util";
import MatrixBot from "./matrix";

export default class Claimer {
  private db: Database;
  private handler: ApiHandler;
  private signer: KeyringPair;
  private bot: any;

  constructor(
    handler: ApiHandler,
    db: Database,
    cfg: ClaimerConfig,
    networkPrefix = 2,
    bot?: any
  ) {
    this.handler = handler;
    this.db = db;
    this.bot = bot;

    const keyring = new Keyring({
      type: "sr25519",
    });

    keyring.setSS58Format(networkPrefix);

    this.signer = keyring.createFromUri(cfg.seed);

    logger.info(
      `(Claimer::constructor) claimer signer spawned: ${this.address}`
    );
  }

  public async claim(unclaimedEras: EraReward[]): Promise<boolean> {
    const api = await this.handler.getApi();
    for (const era of unclaimedEras) {
      const tx = api.tx.staking.payoutStakers(era.stash, era.era);
      await this.sendClaimTx(tx, era);
      const name = await this.db.getCandidate(era.stash);
      if (this.bot) {
        this.bot.sendMessage(
          `Claimer claimed era ${era.era} for validator ${name} - ${era.stash}`
        );
      }
      await sleep(6000);
    }
    return true;
  }

  public get address(): string {
    return this.signer.address;
  }

  sendClaimTx = async (
    tx: SubmittableExtrinsic<"promise">,
    unclaimedEras: EraReward
  ): Promise<boolean> => {
    try {
      const unsub = await tx.signAndSend(this.signer, async (result: any) => {
        // TODO: Check result of Tx - either 'ExtrinsicSuccess' or 'ExtrinsicFail'
        //  - If the extrinsic fails, this needs some error handling / logging added

        const { status } = result;

        logger.info(`(Claimer::sendClaimTx) Status now: ${status.type}`);
        if (status.isFinalized) {
          const finalizedBlockHash = status.asFinalized;
          logger.info(
            `(Claimer::sendClaimTx) Included in block ${finalizedBlockHash}`
          );
          const faultReason = `Era ${unclaimedEras.era} had to be claimed`;
          await this.db.pushFaultEvent(unclaimedEras.stash, faultReason);
          await this.dockPoints(unclaimedEras.stash, unclaimedEras.era);

          await this.db.setBotClaimEvent(
            unclaimedEras.stash,
            unclaimedEras.era,
            finalizedBlockHash
          );

          unsub();
        }
      });

      return true;
    } catch (err) {
      logger.warn(`Nominate tx failed: ${err}`);
      return false;
    }

    return true;
  };

  /// Handles the docking of points from bad behaving validators.
  async dockPoints(stash: Stash, era: number): Promise<boolean> {
    await this.db.dockPointsUnclaimedReward(stash);

    const candidate = await this.db.getCandidate(stash);
    logger.info(
      `${candidate.name} docked points for not claiming era: ${era}. New rank: ${candidate.rank}`
    );
    if (this.bot) {
      await this.bot.sendMessage(
        `${candidate.name} docked points for not claiming era: ${era}. New rank: ${candidate.rank}`
      );
    }

    return true;
  }
}
