import sdk from "matrix-js-sdk";
import { Config, logger, queries } from "./index";

const label = { label: "Matrix" };

export default class MatrixBot {
  public client: any;
  public conf: Config.ConfigSchema;
  private userId = "";

  constructor(
    baseUrl: string,
    accessToken: string,
    userId: string,
    config: Config.ConfigSchema,
  ) {
    this.conf = config;
    this.userId = userId;
    try {
      this.client = sdk.createClient({
        baseUrl,
        accessToken,
        userId,
      });
    } catch (e) {
      logger.error(e);
      logger.error("MatrixBot failed to start", label);
    }
  }

  async start(): Promise<void> {
    this.client.on(
      "RoomMember.membership",
      (
        event: any,
        member: { membership: string; userId: any; roomId: any },
      ) => {
        if (member.membership === "invite" && member.userId === this.userId) {
          this.client.joinRoom(member.roomId).then(() => {
            logger.info(
              `User: ${this.userId} auto joined room: ${member.roomId}`,
              { label: "matrix" },
            );
          });
        }
      },
    );
    this.client.startClient();
    // this.listenForCommands();
  }

  listenForCommands(): void {
    this.client.on(
      "Room.timeline",
      async (event: any, room: any, toStartOfTimeline: any) => {
        if (toStartOfTimeline) return;
        if (event.getType() !== "m.room.message") return;
        if (room.roomId !== this.conf.matrix.room) return;
        const { body } = event.getContent();
        if (body.startsWith("1kv-stats")) {
          const command = body.split(" ")[1];
          if (command == "nominators") {
            const allNominators = await queries.allNominators();
            const msg = allNominators
              .map((nom: any) => `${nom.nominator} | ${nom.current}`)
              .join("\n");
            await this.sendMessage(msg);
          }
          if (command == "targets") {
            const allNominators = await queries.allNominators();
            const msg = (
              await Promise.all(
                allNominators.map(async (nom: any) => {
                  const targets = await queries.getCurrentTargets(
                    nom.nominator,
                  );
                  const whos = targets.join(", ");
                  return `${nom.nominator} is nominating ${whos}`;
                }),
              )
            ).join("\n");
            await this.sendMessage(msg);
          }
        }
      },
    );
  }

  async sendMessage(msg: string): Promise<any> {
    const content = {
      body: msg,
      msgtype: "m.text",
      format: "org.matrix.custom.html",
      formatted_body: msg,
    };
    await this.client.sendEvent(
      this.conf.matrix.room,
      "m.room.message",
      content,
      "",
      (err: any) => {
        logger.error(err);
      },
    );
  }
}
