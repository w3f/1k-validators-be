---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
description: Get started with Polkadot and Web3.
keywords: [introduction, getting started, what is polkadot, why polkadot]
slug: ../getting-started
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info Welcome to the <ProgrammeName/>

The following is a guide to getting started with the <ProgrammeName/>.

:::

# Getting Started

As a validator, getting nominations can be hard. The Thousand Validators Programme helps validators bootstrap themselves and cultivate a community around their reputation.

By applying with the correctly configured setup per these instruction, applicants will be eligible to receive nominations from the Web3 Foundation and Parity Technologies.

## Requirements

:::warn Subject to Change

Note that the following requirements are subject to change at any time.

:::

- Validators have a verified on-chain identity.
- Validators have a minimum stash in their accounts of 10 KSM for Kusama and 5000 DOT for Polkadot
- Validator nodes connect to a private telemetry.
- Validators charge no more than 5% commission for Polkadot and no more than 15% commission for Kusama.
- All nodes must upgrade to the latest version within 12 hours of a release if it is labeled “critical” or “high” priority and 24 hours if it is labeled “medium” or “low” priority
- Validator must operate nodes themselves, they may not be run by a third party or staking provider


Validators meeting the above requirements will obtain a rotation of nominations per period of successful operation. The cadence of nominations is relative to their rank in the programme, where upon performing their duty successfully per period, validators will move up a rank. If a validator fails for any reason (slashing, getting kicked out the validator set, not upgrading on time), that validator’s rank will be halved. If a validator gets slashed, or receives five halvings they will be suspended from nominations and will need to re-apply. These rankings will be made public, to help a validator establish their reputation.

# Applying to the Programme

Validators can apply to the Polkadot Programme [here](https://docs.google.com/forms/d/e/1FAIpQLSdS-alI-J2wgIRCQVjQC7ZbFiTnf36hYBdmO-1ARMjKbC7H9w/viewform?ref=polkadot-network) and the Kusama Programme [here](https://docs.google.com/forms/d/e/1FAIpQLSewhltQOcmkIlE7Wftn0NTVuyEs6Wk8Qpx6ssCAo2BO4oQH0w/viewform)

The following are required to apply to the programme:

◌ Validator Node Name
◌ Stash Account Address
◌ Emergency Phone Number
◌ Email
◌ Riot Handle
The rest of this guide will walk through how to setup a proper configuration for the programme.

# On Chain Identity

Validators must set an on-chain identity have it verified by a registrar.

A validator can best be represented by their identity across the network, as this will carry over to Governance and other on-chain activities. More information about on-chain identity can be found here.

## On Chain Identity Verification

After setting up an on chain identity, it must get verifiec by a registrar. This is to verify the integrity of the on chain identity informatino provided. Validators will not receive nominatinos without a verified on chain identity. More information on verifying an identity and using the W3F Registrar can be found here.

## Setting up sub-identities

If setting up more than one validator node, it is best to set these addtional identities as sub-identities, as each account does not need to be verified by a registrar. More information on sub-identities and how to set them up can be found here.

# Validator Nodes

Setting up a validator node must be done with the utmost security in mind. As the bonded funds of the validator and nominators are at stake, getting slashed can result in up to 100% of funds lost.

More information on setting up a validator node can be found here.

## Setting up a Validator Node

The validator node name can be set with the following flag:

--name NODE_NAME
This name will be what is displayed on the leaderboard and must not change throughout participation in the programme.

WARNING: If a validator changes their node name on telemetry, they will no longer receive nominations and will be marked offline.
In order to participate in the programme, the validator node must connect to a private telemetry endpoint for monitoring. The following flag must be added to the validator node:

--telemetry-url 'wss://telemetry-backend.w3f.community/submit 1'
Setting up Accounts

In order to apply and participate in the program, each participant must have a separate stash and controller account, with the bonded stash account containing at least 50 KSM in it at all times.

The validator must additionally set of a commission of no more than 10%.

Both of these will be checked on a routine basis, and changes to these against the outlined rules will result in negative consequences.