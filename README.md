[![CircleCI](https://circleci.com/gh/w3f/1k-validators-be.svg?style=svg)](https://circleci.com/gh/w3f/1k-validators-be)

# [Thousand Validator Program][thousand]

**To apply to the Kusama Thousand Validator Program - sign up [here][form]**
**To apply to the Polkadot Thousand Validator Program - sign up [here][polkadot form]**

The Thousand Validator Program is a joint initiative between Web3 Foundation
and Parity to help prospective validators achieve nominations to join the 
active set. 

The Thousand Validators Programme operates on both the Kusama and the Polkadot
networks. In order to start validating on the Polkadot network, you should start
on the Kusama network first.

## Kusama Thousand Validators Programme

Requirements for prospective validators on the Kusama network:

 - 50 KSM self-stake.
 - Signed up on the [form][form] and has received approval.
 - Connected to the private telemetry.
 - Seven days of online validator infrastructure.
 - Must have an identity set and verified by a registrar ([instructions](https://wiki.polkadot.network/docs/en/learn-registrar)).

Please see the [blog post][thousand] for more information and requirements for
entering the program.

## Polkadot Thousand Validators Programme

Requirements for prospective validators on the Polkadot network:

- 5,000 DOT self-stake.
- Preferences set to pay rewards to "Staked" (rewards must be automatically bonded).
- Rank 25 or above in the Kusama programme.
- Signed up on the [form][polkadot form] and has received approval.
- Connected to the private telemetry.
- Must have an identity set and verified by a registrar ([instructions](https://wiki.polkadot.network/docs/en/learn-registrar)).

## What is this repository?

The `1k-validator-be` repository houses the backend code for the services that
run the nomination process of the programme. It handles the configuration of
adding new validators to the program, and keeping track that they perform their
duties correctly. It performs the nomination of the validators on the basis of
a CronJob that is run every 24 hours. It is also planned to contain a Matrix
notification service that will bubble up the issues that it finds with different
validators and will explain the reason why they were skipped from nomination.

### Components

- **Database** - A simple persistence layer that can store information across restarts
  of the service.
- **Monitor** - Routinely checks the latest release that is tagged on GitHub and 
  ensures that all connected validators have updated. If they have not, it marks
  them as not good until they upgrade.
- **Nominator** - A wrapper class over the nominating logic.
- **Scorekeeper** - The orchestrator of the other components that spawns nominators
  and has the ability to _start_ and _end_ nomination rounds, incrementing or
  decreasing the scores of validators in the programme.
- **Server** - Exposes a REST API for getting stats about the validators and
  nominators in the programme.
- **Telemetry** - Logic for connecting to the telemetry backend and handling
  new connections.

## Tests

The tests are run using `yarn` and the testing framework AVA. After installing
the dependencies, run `yarn test` to run the unit tests.

### Docker

> Warning: The custom "fast" build of Polkadot is currently __very__ outdated.

The entire system can be spun up using a custom "fast" build of Polkadot
that starts a new Era every 6 minutes. Move the `config.sample.json` to `config.json`
and start the proccesses using `yarn docker`.

### Matrix Bot

To enable the matrix bot you will need to create an account on Element or a similar
service and acquire an access token. Enter the access token in the configuration
file and specify the room that the bot should send the messages in. Make sure you
invite the bot to the room before you start the services.

[thousand]: https://polkadot.network/join-kusamas-thousand-validators-programme/
[form]: https://docs.google.com/forms/d/e/1FAIpQLSewhltQOcmkIlE7Wftn0NTVuyEs6Wk8Qpx6ssCAo2BO4oQH0w/viewform
[polkadot form]: https://docs.google.com/forms/d/e/1FAIpQLSdS-alI-J2wgIRCQVjQC7ZbFiTnf36hYBdmO-1ARMjKbC7H9w/viewform

