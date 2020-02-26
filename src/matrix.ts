import * as sdk from 'matrix-js-sdk';

//@ts-ignore
// const matrixClient = sdk.createClient({
//   baseUrl: "https://matrix.org",
//   accessToken,
//   userId,
// });

// matrixClient.on('RoomMember.membership', async (event: any, member: any) => {
//   if (member.membership === 'invite' && member.userId === userId) {
//     await matrixClient.joinRoom(member.roomId);
//     console.log(`Auto-joined ${member.roomId}`);
//   }
// });

// matrixClient.on('Room.timeline', async (event: any, room: any, toStartOfTimeline: any) => {
//   if (toStartOfTimeline) {
//     return; // don't print any results.
//   }
//   if (event.getType() !== 'm.room.message') {
//     return; // only print messages
//   }
//   console.log(`(${room.name}) ${event.getSender()} :: ${event.getContent().body}`);
// });

// matrixClient.startClient();

const ROOM = "!mdugGIKqSTweIOpTlA:web3.foundation";

export default class MatrixBot  {
  public client: any;
  public db: any;

  constructor(baseUrl: string, accessToken: string, userId: string, db: any) {
    //@ts-ignore
    this.client = sdk.createClient({
      baseUrl,
      accessToken,
      userId,
    });
    this.db = db;

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
      if (room.roomId !== ROOM) return;
      const { body } = event.getContent();
      console.log(body);
      if (body.startsWith('1kv-stats')) {
        const command = body.split(' ')[1];
        console.log('CMD', command);
        if (command == 'nominators') {
          const allNominators = await this.db.allNominators();
          const msg = allNominators.map((nom: any) => `${nom.nominator} | ${nom.current}`).join('\n');
          await this.sendMessage(msg);
        }
        if (command == 'targets') {
          const allNominators = await this.db.allNominators();
          const msg = (await Promise.all(allNominators.map(async (nom: any) => {
            const targets =  await this.db.getCurrentTargets(nom.nominator);
            console.log(targets);
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
      this.client.sendEvent(ROOM, 'm.room.message', content, '', (err: any, res: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }
}
