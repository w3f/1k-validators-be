import ApiHandler from "./../ApiHandler";
import { Keyring } from "@polkadot/keyring";
import { sleep } from "../util";

export const startTestSetup = async () => {
  const handler = await ApiHandler.create(["ws://172.28.1.1:9944"]);
  const api = await handler.getApi();
  console.log(
    `{TestSetup::startTestSetup} handler ws://172.28.1.1:9944 is connected: ${handler.isConnected()}`
  );

  const keyring = new Keyring({ type: "sr25519" });

  const nominators = [
    {
      name: "Nom 1",
      address: "5F6h9fXgSjPdmZDZQSsFyKUL1sPbuzTRn3TwbhGuSvPecB7d",
      seed: "van theme secret toddler rapid skirt pigeon hedgehog exhibit address guilt motor",
      controllerAddress: "5DvJnBAoDs1DibZ2pAsVA6FK42sDjA7P1vjEXaDBq7UwuMbZ",
      controllerSeed:
        "assault melt verify taste issue unfold peasant fee surprise weasel cliff middle",
      proxyAddress: "5Dr3JRGyhWUm6g7iHgs4byoUTyis1xShkZpAL6Ju4DFak7ti",
      proxySeed:
        "raw security lady smoke fit video flat miracle change hurdle potato apple",
      keyring: "",
    },
    {
      name: "Nom 2",
      address: "5Gc2R35GvWAJ2uSHcLUceJudMJftbVp6Y788xzRpv8qy86sD",
      seed: "prevent mushroom elevator thumb stable unfair alcohol find leg fly couple deny",
      controllerAddress: "5HGULWbEMfFeD1c5nqQbzZa1gTrVdHAv396J2UHmmMpbdd3x",
      controllerSeed:
        "audit cotton absorb throw reduce bachelor chat gesture client mango derive note",
      proxyAddress: "5F3nCQmgWSX3Fr1SqNGaEGzr71EckarUP5Rf8ufQmRReEoJV",
      proxySeed:
        "correct essay panda fence olympic control sorry post ski hurt athlete ritual",
      keyring: "",
    },
    {
      name: "Nom 3",
      address: "5H1payfDS728ksrRi9D88RPQmyQFsZVdEFHYM4BKEiwfVJY9",
      seed: "panda party toe child advance lawsuit meadow burden access below brown lift",
      controllerAddress: "5D85XirtLYnQW5juD5PvdEM2ZPVpDbja6k6CGapouv2P3weK",
      controllerSeed:
        "neither seminar equip split horn city weapon bike brown muscle coast ski",
      keyring: "",
    },
    {
      name: "Nom 4",
      address: "5FkQP1FCvGVRX9QXu4oyxW9EjroC8eaTbJ8GLRbbQXv7AZfj",
      seed: "physical glance describe mandate consider cricket detail excuse steak artwork broccoli diesel",
      controllerAddress: "5Fv2wTeevGBNEJNZMWEhedEsZG41i9Fy9QeyN9mvZ4gYGahA",
      controllerSeed:
        "bar exhaust category dilemma feature furnace fetch useless beach burst narrow nest",
      keyring: "",
    },
    {
      name: "Nom 5",
      address: "5CXru9Vt1fPCnwyxqqcXwyvB6ibybjkAWBwzqaRgH5MV66Ax",
      seed: "cruel join arch wrap stereo cement roast frame fog drill mandate loyal",
      controllerAddress: "5GdrmHHQzZFfwbU2okRHwLeuF5V88gAvsaQdyjp1qBPpXNZe",
      controllerSeed:
        "milk snake bracket tomato little peanut claim cook gate decide crystal luggage",
      keyring: "",
    },
  ];

  const claimer = {
    seed: "card insect figure furnace better miracle lend monitor call inner half top",
    address: "15B4rygvyb1BdA33AatuT7btLiZSUfcAS14X1SLrDfpq8Eou",
  };

  const nodes = [
    {
      name: "alice",
      keyring: null,
      address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      derivation: "//Alice",
      endpoint: "ws://172.28.1.1:9944",
      initialized: false,
    },
    {
      name: "alice stash",
      keyring: null,
      address: "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
      derivation: "//Alice//stash",
      endpoint: "ws://172.28.1.1:9944",
      initialized: false,
    },
    {
      name: "bob",
      keyring: null,
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      derivation: "//Bob",
      endpoint: "ws://172.28.1.2:9945",
      initialized: false,
    },
    {
      name: "bob stash",
      keyring: null,
      address: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
      derivation: "//Bob//stash",
      endpoint: "ws://172.28.1.1:9944",
      initialized: false,
    },
    {
      name: "charlie",
      keyring: null,
      address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      derivation: "//Charlie",
      endpoint: "ws://172.28.1.3:9946",
      initialized: false,
      controllerSeed:
        "phrase rare become arm tip comic fall solar also chunk hip sister",
      controllerAddress: "1c4yKdZVbCTRdnpcxAxXKc2DWBj7G5gFKaVGmqLkhQseCHG",
    },
    {
      name: "dave",
      keyring: null,
      address: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
      derivation: "//Dave",
      endpoint: "ws://172.28.1.4:9947",
      initialized: false,
      controllerSeed:
        "motion pool scatter easy stuff announce blossom dolphin phone glimpse insane know",
      controllerAddress: "12QfoJkNA2PEuHJ7S8fNA1KZd4TCDs1wJRVHnKYUYSBRJbwC",
    },
    {
      name: "eve",
      keyring: null,
      address: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
      derivation: "//Eve",
      endpoint: "ws://172.28.1.5:9948",
      controllerSeed:
        "game hire venture detect awake wheel cry car figure cost swap grab",
      controllerAddress: "131VvQMevR7N1URBHzZzZS3jYLeU3nbpVc8hriyJe6UKHWyy",
    },
    {
      name: "ferdie",
      keyring: null,
      address: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
      derivation: "//Ferdie",
      endpoint: "ws://172.28.1.6:9949",
      initialized: false,
      controllerSeed:
        "buzz forget chapter reveal enemy manage attend yellow merit fortune gas question",
      controllerAddress: "12bREtMSCBAkTx7JJ1Q3QJdxAP6MPcizBRSQ8Japt6Dy8fUe",
    },
  ];

  // Send funds to reward claimer:
  console.log(
    `{TestSetup::RewardClaimer} Sending funds to reward claimer address: ${claimer.address}`
  );
  const claimerTransfer = api.tx.balances.transfer(
    claimer.address,
    "12345678912345"
  );
  try {
    const hash = await claimerTransfer.signAndSend(
      keyring.addFromUri("//Alice")
    );
  } catch {
    console.log(
      `{TestSetup::Reward::${claimer.address}} transfer tx failed...`
    );
  }
  await sleep(3000);

  // For each nominator:
  // - Transfer some balance into the stash account from Alice
  // - Transfer some balance into the controller account from Alice
  // - Transfer some balance into the proxy account from Alice
  // - Bond to controller
  for (const nominator of nominators) {
    // Send funds to the Nominator Stash
    console.log(
      `{TestSetup::${nominator.name}} Sending funds to nominator stash account: ${nominator.address}`
    );
    const transfer = api.tx.balances.transfer(
      nominator.address,
      "123456789123456789"
    );
    try {
      const hash = await transfer.signAndSend(keyring.addFromUri("//Alice"));
    } catch {
      console.log("{TestSetup::${nominator.name}} transfer tx failed...");
    }
    await sleep(3000);

    // Send funds to the Nominator Controller
    console.log(
      `{TestSetup::${nominator.name}} Sending funds to nominator controller account: ${nominator.controllerAddress}`
    );
    const transferController = api.tx.balances.transfer(
      nominator.controllerAddress,
      "12345678912345"
    );
    try {
      const hash = await transferController.signAndSend(
        keyring.addFromUri("//Alice")
      );
    } catch {
      console.log("{TestSetup::${nominator.name}} transfer tx failed...");
    }
    await sleep(3000);

    // Transfer to Proxy Address, and set Proxy account as a proxy to the Controller
    if (nominator.proxyAddress) {
      console.log(
        `{TestSetup::${nominator.name}} Sending funds to nominator proxy account: ${nominator.address}`
      );
      const transferProxy = api.tx.balances.transfer(
        nominator.proxyAddress,
        "123456789123456"
      );
      try {
        const hash = await transferProxy.signAndSend(
          keyring.addFromUri("//Alice")
        );
      } catch {
        console.log("{TestSetup::${nominator.name}} transfer tx failed...");
      }
      await sleep(3000);

      const setProxy = api.tx.proxy.addProxy(
        nominator.proxyAddress,
        "Staking",
        30
      );
      try {
        const hash = await setProxy.signAndSend(
          keyring.addFromUri(nominator.controllerSeed)
        );
      } catch {
        console.log(`{TestSETUP::${nominator.name} set proxy failed...`);
      }
    }

    // Bond the Nominator stash to the Nominator controller
    console.log(
      `{TestSetup::${nominator.name}} Bonding nominator account: ${nominator.address}`
    );
    const key = keyring.addFromUri(nominator.seed);
    const bond = api.tx.staking.bond(
      nominator.controllerAddress,
      "10000000000000000",
      "Staked"
    );
    try {
      const bondTx = await bond.signAndSend(key);
    } catch {
      console.log(`{TestSetup::${nominator.name}} bond tx failed`);
    }
  }
  await sleep(6000);

  // Set Alice as a registrar
  console.log(`{TestSetup} Setting Alice as a Registrar`);
  const reg = api.tx.identity.addRegistrar(
    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  );
  const su = api.tx.sudo.sudo(reg);
  await su.signAndSend(keyring.addFromUri("//Alice"));
  await sleep(6000);

  // Set Force New Era Always
  console.log(`{TestSetup} set Force New Era Always`);
  const forceEra = api.tx.staking.forceNewEraAlways();
  const su2 = api.tx.sudo.sudo(forceEra);
  await su2.signAndSend(keyring.addFromUri("//Alice"));
  await sleep(6000);

  // Increase Validator Set Size to 5
  console.log(`{TestSetup} Increase validator set size to 5`);
  const increaseSet = api.tx.staking.increaseValidatorCount(3);
  const su3 = api.tx.sudo.sudo(increaseSet);
  await su3.signAndSend(keyring.addFromUri("//Alice"));
  await sleep(6000);

  // For each node:
  // - add the keyring
  // - set an identity
  // - verify the identity
  // - bond the account
  // - generate session keys
  // - set session keys on chain
  for (const node of nodes) {
    await sleep(6000);

    console.log(`{TestSetup::${node.name}} setting up ${node.name}`);
    node.keyring = keyring.addFromUri(node.derivation);

    try {
      console.log(
        `{TestSetup::${node.name}} setting identity for ${node.name} ${node.address}`
      );
      const identity = api.tx.identity.setIdentity({
        display: { Raw: `${node.name}` },
      });
      const identityTx = await identity.signAndSend(node.keyring);
      await sleep(3000);
    } catch {
      console.log(`{TestSetup:${node.name}} set identity failed...`);
    }

    await sleep(3000);

    try {
      console.log(
        `{TestSetup::${node.name}} verifying identity for ${node.name}`
      );
      const verify = api.tx.identity.provideJudgement(
        0,
        node.address,
        "Reasonable"
      );
      await verify.signAndSend(keyring.addFromUri("//Alice"));
      await sleep(3000);
    } catch {
      console.log(`{TestSetup:${node.name}} verify identity failed...`);
    }

    if (
      node.name === "alice" ||
      node.name == "alice stash" ||
      node.name === "bob" ||
      node.name === "bob stash"
    )
      continue;

    const controllerKeyring = keyring.addFromUri(node.controllerSeed);
    console.log(`{TestSetup:${node.name}} Sending Funds to Controller...`);
    const transfer = api.tx.balances.transfer(
      node.controllerAddress,
      "1234567891234"
    );
    await transfer.signAndSend(node.keyring);

    const handler = await ApiHandler.create([node.endpoint]);
    const nodeApi = await handler.getApi();

    await sleep(16000);
    console.log(`{TestSetup:${node.name}} Bonding Stash...`);
    const bond = api.tx.staking.bond(
      node.controllerAddress,
      "100000000000000",
      "Staked"
    );
    const bondTx = await bond.signAndSend(
      node.keyring,
      ({ events = [], status }) => {
        events.forEach(async ({ event: { data, method, section }, phase }) => {
          if (status.isFinalized && method == "ExtrinsicSuccess") {
            console.log(
              `{TestSetup::${node.name}} Bond Successful, generating session keys...`
            );

            await sleep(6000);
            const sessionKeys = await nodeApi.rpc.author.rotateKeys();
            const setKeys = nodeApi.tx.session.setKeys(
              // @ts-ignore
              sessionKeys.toHex(),
              "0x"
            );
            await setKeys.signAndSend(
              controllerKeyring,
              ({ events = [], status }) => {
                events.forEach(
                  async ({ event: { data, method, section }, phase }) => {
                    if (status.isFinalized && method == "ExtrinsicSuccess") {
                      console.log(
                        `{TestSetup::${node.name}} Setting Session Keys Successful, setting intent to validate....`
                      );
                      const validate = nodeApi.tx.staking.validate("0x10");
                      await validate.signAndSend(
                        controllerKeyring,
                        async ({ events = [], status }) => {
                          if (status.isFinalized && !node.initialized) {
                            console.log(
                              `{TestSetup::${node.name}} Validate tx successful`
                            );
                            console.log(
                              `{TestSetup::${node.name}} Disconnecting from api endpoint: ${node.endpoint}`
                            );

                            if (nodeApi.isConnected) {
                              nodeApi.disconnect();
                              node.initialized = true;
                            }
                          }
                        }
                      );
                    }
                  }
                );
              }
            );
          }
        });
      }
    );

    console.log(`{TestSetup::${node.name}} setup done`);
    await sleep(6000);
  }
};

const logTx = (events, status) => {
  console.log("Transaction status:", status.type);

  if (status.isInBlock) {
    console.log("Included at block hash", status.asInBlock.toHex());
    console.log("Events:");

    events.forEach(({ event: { data, method, section }, phase }) => {
      console.log(
        "\t",
        phase.toString(),
        `: ${section}.${method}`,
        data.toString()
      );
    });
  } else if (status.isFinalized) {
    console.log("Finalized block hash", status.asFinalized.toHex());

    process.exit(0);
  }
};
