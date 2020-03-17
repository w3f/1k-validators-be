//@ts-ignore
import * as sdk from 'matrix-js-sdk';

export default class MatrixBot  {
  public client: any;
  public conf: any;
  public db: any;

  constructor(baseUrl: string, accessToken: string, userId: string, db: any, config: any) {
    //@ts-ignore
    this.client = sdk.createClient({
      baseUrl,
      accessToken,
      userId,
    });
    this.db = db;
    this.conf = config;

    console.log('Bot initiated');
  }

  start() {
    this.client.startClient();
    this.listenForCommands();
  }

  listenForCommands() {
    this.client.on('Room.timeline', async (event: any, room: any, toStartOfTimeline: any) => {
      if (toStartOfTimeline) return;
      if (event.getType() !== 'm.room.message') return;
      if (room.roomId !== this.conf.matrix.room) return;
      const { body } = event.getContent();
      if (body.startsWith('1kv-stats')) {
        const command = body.split(' ')[1];
        if (command == 'nominators') {
          const allNominators = await this.db.allNominators();
          const msg = allNominators.map((nom: any) => `${nom.nominator} | ${nom.current}`).join('\n');
          await this.sendMessage(msg);
        }
        if (command == 'targets') {
          const allNominators = await this.db.allNominators();
          const msg = (await Promise.all(allNominators.map(async (nom: any) => {
            const targets =  await this.db.getCurrentTargets(nom.nominator);
            const whos = targets.join(', ');
            return `${nom.nominator} is nominating ${whos}`;
          }))).join('\n');
          await this.sendMessage(msg);
        }
      }
    });
  }

  sendMessage(msg: string): Promise<boolean> {
    const content = {
      body: msg,
      msgtype: 'm.text',
    };

    return new Promise((resolve: any, reject: any) => {
      this.client.sendEvent(this.conf.matrix.room, 'm.room.message', content, '', (err: any, res: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }
}
