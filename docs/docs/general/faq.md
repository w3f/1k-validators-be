---
id: faq
title: FAQ
sidebar_label: FAQ
description: FAQ
keywords: [faq]
slug: ../faq
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info FAQ <ProgrammeName/>

The following is a list of frequently asked questions.

:::

### Why is my node marked as Invalid?

There can be multiple reasons why the node is marked as invalid - some which may be because of some misconfigurations. The following is some guidelines and things to check:

- Make sure the node is up and visable on the w3f hosted telemetry instance :  https://telemetry.w3f.community/
- Make sure that the node name on telemetry exactly matches with what is included in the candidates json files : https://github.com/w3f/1k-validators-be/tree/master/candidates
- Make sure that there is only one node with that name going to telemetry
- Ensure that the node is on the latest client version
- Ensure that the stash address has a verified identity set
- Ensure that the commission is within the range allowed by the programme
- Ensure that the node has enough self stake if the node has not been accepted for a Case for Good Intentions
- Ensure that the node is not running on an infrastructure provider that is not allowed in the programme (only hetzner, contabo for now)

### I've applied but my node has not been accepted yet

New nodes generally get added in batches every week or so.

Nodes that have been added can be found in the given JSON files:

https://github.com/w3f/1k-validators-be/tree/master/candidates

If it has been a while since the initial application, it's possible that the node has been not been added because:

1.) The initial application didn't contain valid inputs for the node name / stash / matrix handle / etc

2.) The applicant already has the max amount of nodes allowed in the programme (at the moment this is 2 for Kusama and 1 for Polkadot - note that this may change in the future).

3.) The node has not been setup properly and/or does not meet some of the requirements

### My node in the programme is self-sustaining, can I add another node?

Validators are allowed up to 2 nodes for Kusama and 1 node for Polkadot. If a node is self sustaining, it is possible change another node to the programme. 

Validators added to the programme have their stash address and telemetry name from their application added into the config files, which are used to query data on chain and track nodes via telemetry.

For telemetry -  node name matching is what the 1kv backend uses to determine if the node is up or not - if the name is not matching it will show up as being offline. Fill this out if you wish to change the telemetry name that is used to track nodes being online. Also Please ensure that you can see the node up and running on https://telemetry.w3f.community/ for the given network.

Validators may also switch out their stash address with another of theirs. If a node becomes self sustaining in nominations and you wish to switch it out with a new one, fill this out. Note that validators still are constrained to the limits of the programme such that 1.) validators are allowed 2 kusama nodes and 1 polkadot node within the programme and 2.) any new stash address/node will still need to meet the same requirements of onchain identity, self stake, commission, etc.

### My node is not receiving nominations

Please ensure that your node is properly setup and has the appropriate telemetry flags. See the above section on why a node may be invalid. If the node is valid and has not received nominations in a while it may have a low score compared to other validators, and some adjustments may need to be made to increase the score.