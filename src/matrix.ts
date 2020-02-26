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

  constructor(baseUrl: string, accessToken: string, userId: string) {
    //@ts-ignore
    this.client = sdk.createClient({
      baseUrl,
      accessToken,
      userId,
    });
    console.log('Bot initiated');
  }

  start() {
    this.client.startClient();
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
