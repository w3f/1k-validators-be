import * as sdk from "matrix-js-sdk";
import { Config, logger, queries } from "@1kv/common";

const label = { label: "Matrix" };

export default class MatrixBot {
  public client: any;
  public conf: Config.ConfigSchema;

  constructor(
    baseUrl: string,
    accessToken: string,
    userId: string,
    config: Config.ConfigSchema,
  ) {
    try {
      this.client = sdk.createClient({
        baseUrl,
        accessToken,
        userId,
      });
      this.conf = config;
    } catch (e) {
      logger.error(e.toString());
      logger.error("MatrixBot failed to start", label);
    }
  }

  async start(): Promise<void> {
    this.client.on("RoomMember.membership", function (event, member) {
      if (member.membership === "invite" && member.userId === this.userId) {
        this.client.joinRoom(member.roomId).then(function () {
          logger.info(
            `User: ${this.userId} auto joined room: ${member.roomId}`,
            { label: "matrix" },
          );
        });
      }
    });
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
