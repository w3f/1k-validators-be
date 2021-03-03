import  ApiHandler  from './../ApiHandler';
const { Keyring } = require('@polkadot/keyring');
import type { Keys } from '@polkadot/types/interfaces';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { sleep } from '../util';




export const startTestSetup = async () => {
    const handler = await ApiHandler.create(['ws://172.28.1.1:9944']);
    const api = await handler.getApi();
    console.log(`{TestSetup::startTestSetup} handler ws://172.28.1.1:9944 is connected: ${handler.isConnected()}`);

    const keyring = new Keyring({ type: 'sr25519' });

    const nominators = [
      {
        'name': 'Nom 1',
        'address': '5F6h9fXgSjPdmZDZQSsFyKUL1sPbuzTRn3TwbhGuSvPecB7d',
        'seed': 'van theme secret toddler rapid skirt pigeon hedgehog exhibit address guilt motor',
        'keyring': ''
      },
      {
        'name': 'Nom 2',
        'address': '5Gc2R35GvWAJ2uSHcLUceJudMJftbVp6Y788xzRpv8qy86sD',
        'seed': 'prevent mushroom elevator thumb stable unfair alcohol find leg fly couple deny',
        'keyring': ''
      },
      {
        'name': 'Nom 3',
        'address': '5H1payfDS728ksrRi9D88RPQmyQFsZVdEFHYM4BKEiwfVJY9',
        'seed': 'panda party toe child advance lawsuit meadow burden access below brown lift',
        'keyring': ''
      },
      {
        'name': 'Nom 4',
        'address': '5FkQP1FCvGVRX9QXu4oyxW9EjroC8eaTbJ8GLRbbQXv7AZfj',
        'seed': 'physical glance describe mandate consider cricket detail excuse steak artwork broccoli diesel',
        'keyring': ''
      },
      {
        'name': 'Nom 5',
        'address': '5CXru9Vt1fPCnwyxqqcXwyvB6ibybjkAWBwzqaRgH5MV66Ax',
        'seed': 'cruel join arch wrap stereo cement roast frame fog drill mandate loyal',
        'keyring': ''
      }
    ]

    const nodes = [
        {
          'name': 'alice',
          'keyring': '',
          'address': '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          'derivation': '//Alice',
          'endpoint': 'ws://172.28.1.1:9944'
        },
        {
          'name': 'bob',
          'keyring': '',
          'address': '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          'derivation': '//Bob',
          'endpoint': 'ws://172.28.1.2:9945'
        },
        {
          'name': 'charlie',
          'keyring': '',
          'address': '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
          'derivation': '//Charlie',
          'endpoint': 'ws://172.28.1.3:9946'
        },
        {
          'name': 'dave',
          'keyring': '',
          'address': '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
          'derivation': '//Dave',
          'endpoint': 'ws://172.28.1.4:9947'
        },
        {
          'name': 'eve',
          'keyring': '',
          'address': '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
          'derivation': '//Eve',
          'endpoint': 'ws://172.28.1.5:9948'
        },
        {
          'name': 'ferdie',
          'keyring': '',
          'address': '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
          'derivation': '//Ferdie',
          'endpoint': 'ws://172.28.1.6:9949'
        },
    ]

    for (let i = 0; i <= 10; i++){
      const mnemonic = mnemonicGenerate();
      // console.log(mnemonic);
    }

    for (const nominator of nominators) {
    // Create a extrinsic, transferring 12345 units to Bob
      console.log(`Sending funds to nominator account: ${nominator.address}`);
      const transfer = api.tx.balances.transfer(nominator.address, 1234567891234567);
      try {
        const hash = await transfer.signAndSend(keyring.addFromUri('//Alice'));
      } catch {
        console.log('transfer tx failed...');
      }
  
      
      console.log(`Bonding nominator account: ${nominator.address}`);
      await sleep(3000);


      const key = keyring.addFromUri(nominator.seed);
      const bond = api.tx.staking.bond(nominator.address, '1000000000000000', 'Staked');
      try {
        const bondTx = await bond.signAndSend(key);
      } catch {
        console.log('bond tx failed');
      }

    }

    // For each node:
    // - add the keyring
    // - bond the account
    // - generate session keys
    // - set session keys on chain
    for (const node of nodes){
      if (node.name === 'alice' || node.name === 'bob') continue;
      console.log(`{TestSetup::${node.name}} setting up ${node.name}`);
      node.keyring = keyring.addFromUri(node.derivation);

      const handler = await ApiHandler.create([node.endpoint]);
      const nodeApi = await handler.getApi();

      const bond = api.tx.staking.bond(node.address, '1000000000000000', 'Staked');
      const bondTx = await bond.signAndSend(node.keyring, ({ events = [], status }) => {
        events.forEach(async ({ event: { data, method, section }, phase }) => {
          if (method == 'ExtrinsicSuccess'){
            console.log('{TestSetup::${node.name}} Bond Successful, generating session keys...');

            const sessionKeys = await nodeApi.rpc.author.rotateKeys();
            // @ts-ignore
            const setKeys = nodeApi.tx.session.setKeys(sessionKeys.toHex(), '0x');
            await setKeys.signAndSend(node.keyring, ({ events = [], status }) => {
              events.forEach(async ({ event: { data, method, section }, phase }) => {
                if (method == 'ExtrinsicSuccess'){
                  console.log('{TestSetup::${node.name}} Setting Session Keys Successful, setting intent to validate....');
                  const validate = nodeApi.tx.staking.validate('0x10');
                  await validate.signAndSend(node.keyring, ({ events = [], status }) => {
                    events.forEach(async ({ event: { data, method, section }, phase }) => {
                      if (method == 'ExtrinsicSuccess'){
                        console.log('{TestSetup::${node.name}} Validate tx successful');
                        console.log(`{TestSetup::${node.name}} Disconnecting from api endpoint: ${node.endpoint}`);
                        nodeApi.disconnect();
                      }
                    });
                  });
                }
              });
            });
          }
        });
      });
      console.log(`{TestSetup::${node.name}} setup done`);
      sleep(6000);
    }

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