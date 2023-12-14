---
id: common
title: Common
sidebar_label: Common
description: Common Documentation
keywords: [common]
slug: ../common
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info `Common` package

A a library of shared functions, utilities, types, and constants.

:::

# Overview

## DB

MongoDB is used as the database for the backend. The schemas for objects are specified in `models.ts`.  

For the various models, functions for querying and setting values are implemented in the corresponding files within the `./queries`directory. These can then be exported and used in other packages.

For example:
    
```typescript
import {
  queries
} from "@1kv/common";
const candidates = await queries.allCandidates();    
```

imports all the exported queries from the`common` package and will query mongodb for all candidates.

## ApiHandler

The `ApiHandler` is a wrapper around the Polkadot.js api to create an instance of the api that connects to an RPC node. This is then used and shared throughout the service as a singleton.

## Config

Here is where the Config types are specified, as well as the functions for loading a `main.json` and `secret.json` config.

## Constants

Here is where various constants are defined where values will default to if not specified in the config for example.

## Constraints

Constraints is the main class where both validity checking and scoring occurs. It is used by both `core` and `worker` packages.

It is instantiated with a config, where score weights are specified, as well as a few flags that can be set to enable or disable certain checks.

## Validity Checking

`checkCandidate` with take a candidate and determine either `true` or `false` for it's validity based on what checks are enabled and some of the config options. 

## Logger

The logger is a wrapper around the `winston` logger. It is used to log messages to the console, and to a file. The log level can be set in the config.

## Score

Varous math functions used in scoring candidates are defined here.

## Types

Various Typescript types are defined here.

## Util

Various utility functions are defined here.