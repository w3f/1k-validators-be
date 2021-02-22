import  ApiHandler  from '../src/ApiHandler';
const { Keyring } = require('@polkadot/keyring');
import type { Keys } from '@polkadot/types/interfaces';
import { mnemonicGenerate } from '@polkadot/util-crypto';




const start = async () => {
    const handler = await ApiHandler.create(['ws://172.28.1.1:9944']);
    const api = await handler.getApi();
    console.log(handler.isConnected());
    console.log('hello');

    const keyring = new Keyring({ type: 'sr25519' });

    const nodes = [
        {
            'name': 'alice',
            'keyring': '',
            'address': '',
            'derivation': ''
        },
    ]

    for (let i = 0; i <= 10; i++){
      const mnemonic = mnemonicGenerate();
    }

    // Add Alice to our keyring with a hard-deived path (empty phrase, so uses dev)
    const alice = keyring.addFromUri('//Alice');
    const bob = keyring.addFromUri('//Bob');
    const charlie = keyring.addFromUri('//Charlie');
    const dave = keyring.addFromUri('//Dave');
    const eve = keyring.addFromUri('//Eve');
    const ferdie = keyring.addFromUri('//Ferdie');
  

    const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const ALICE_STASH = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY';
    const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
    const BOB_STASH = '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc';
    const CHARLIE = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';
    const DAVE = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';
    const EVE = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw';
    const FERDIE = '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL';

    const bondCharlie = api.tx.staking.bond(CHARLIE, '1000000000000000', 'Staked');
    const bondCharlieTx = await bondCharlie.signAndSend(charlie, ({ events = [], status }) => {
      logTx(events,status);
      });


    const bondDave = api.tx.staking.bond(DAVE, '1000000000000000', 'Staked');
    const bondDaveTx = await bondDave.signAndSend(dave, ({ events = [], status }) => {
      logTx(events,status);
    });
    // console.log(`bond was successful with hash: ${bondDaveTx}`);

    const bondEve = api.tx.staking.bond(EVE, '1000000000000000', 'Staked');
    const bondEveTx = await bondEve.signAndSend(eve, ({ events = [], status }) => {
      logTx(events,status);
      });


    const bondFerdie = api.tx.staking.bond(FERDIE, '1000000000000000', 'Staked');
    const bondFerdieTx = await bondFerdie.signAndSend(ferdie, ({ events = [], status }) => {
      logTx(events,status);
      });
    // console.log(`bond was successful with hash: ${bondDaveTx}`);


    const sessionKeys = await api.rpc.author.rotateKeys();
    // @ts-ignore
    const setKeys = api.tx.session.setKeys(sessionKeys.toHex(), '0x');
    await setKeys.signAndSend(charlie, ({ events = [], status }) => {
      logTx(events,status);
          });

          const sessionKeys2 = await api.rpc.author.rotateKeys();
          // @ts-ignore
          const setKeys2 = api.tx.session.setKeys(sessionKeys2.toHex(), '0x');
          await setKeys2.signAndSend(dave, ({ events = [], status }) => {
            logTx(events,status);
                });

          const sessionKeys3 = await api.rpc.author.rotateKeys();
          // @ts-ignore
          const setKeys3 = api.tx.session.setKeys(sessionKeys3.toHex(), '0x');
          await setKeys3.signAndSend(eve, ({ events = [], status }) => {
            logTx(events,status);
                });

          const sessionKeys4 = await api.rpc.author.rotateKeys();
          // @ts-ignore
          const setKeys4 = api.tx.session.setKeys(sessionKeys4.toHex(), '0x');
          await setKeys4.signAndSend(ferdie, ({ events = [], status }) => {
                  logTx(events,status);
                });
                  






    // Create a extrinsic, transferring 12345 units to Bob
    const transfer = api.tx.balances.transfer(BOB, 12345);
  
    // Sign and send the transaction using our account
    // const hash = await transfer.signAndSend(alice);
  
    // console.log('Transfer sent with hash', hash.toHex());

}

const logTx = (events, status) => {
  console.log('Transaction status:', status.type);
            
  if (status.isInBlock) {
    console.log('Included at block hash', status.asInBlock.toHex());
    console.log('Events:');

    events.forEach(({ event: { data, method, section }, phase }) => {
      console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
    });
  } else if (status.isFinalized) {
    console.log('Finalized block hash', status.asFinalized.toHex());

    process.exit(0);
  }
}



start();