import { Keyring } from "@polkadot/api";
import { ApiHandler, logger, Util, Types, Db } from "@1kv/common";
import { KeyringPair } from "@polkadot/keyring/types";
import { SubmittableExtrinsic } from "@polkadot/api/types";

export default class Claimer {
  private db: Db;
  private handler: ApiHandler;
  private signer: KeyringPair;
  private bot: any;

  constructor(
    handler: ApiHandler,
    db: Db,
    cfg: Types.ClaimerConfig,
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

  public async claim(unclaimedEras: Types.EraReward[]): Promise<boolean> {
    const api = await this.handler.getApi();
    for (const era of unclaimedEras) {
      const tx = api.tx.staking.payoutStakers(era.stash, era.era);
      await this.sendClaimTx(tx, era);
      const candidate = await this.db.getCandidate(era.stash);
      if (this.bot) {
        await this.bot.sendMessage(
          `Claimer claimed era ${era.era} for validator ${candidate.name} - ${era.stash}`
        );
      }
      await Util.sleep(12000);
    }
    return true;
  }

  public get address(): string {
    return this.signer.address;
  }

  sendClaimTx = async (
    tx: SubmittableExtrinsic<"promise">,
    unclaimedEras: Types.EraReward
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
          const faultExists = await this.db.pushFaultEvent(
            unclaimedEras.stash,
            faultReason
          );
          if (!faultExists) {
            await this.dockPoints(unclaimedEras.stash, unclaimedEras.era);

            await this.db.setBotClaimEvent(
              unclaimedEras.stash,
              unclaimedEras.era,
              finalizedBlockHash
            );
          }

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
  async dockPoints(stash: Types.Stash, era: number): Promise<boolean> {
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
