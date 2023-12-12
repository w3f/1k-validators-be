---
id: worker
title: Worker
sidebar_label: Worker
description: Worker Documentation
keywords: [worker]
slug: ../worker
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info `Worker` package

Jobs, Workers, and Queues for tasks.

:::

# Overview

## Jobs

Jobs are tasks to be done, such as querying data from the chain, checking validity, executing pending time delay announcements, etc. They are defined in the `worker` package, although when the backed is run as a monolith, these are imported into the `core` package, and the job functions are run there as cron jobs. When run as microservices, `core` will put a add a job onto the queue, and a `worker` instance will pick a job from the queue, and execute it.

### ActiveValidatorJob

The `ActiveValidatorJob` will query the list of candidates, check the current validator set, and set the `active` field of the candidate to `true` if they are currently in the valiator set, and `false` if they are not.

### BlockDataJob

The `BlockDataJob` is responsible for taking a block number and parsing it for extrinsics and events. 

Rewards are indexed here from `payoutStakers` extrinsics, where the transaction is matched to the `Reward` event, with context dependant info queried at the block height and time period that the reward was issued.

### ConstraintsJob

Within constraints there are two main functions that will be run - `validityJob`, and `scoreJob`. `validityJob` will check the validity of all candidates, and `scoreJob` will calculate the score of all candidates.