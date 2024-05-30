---
id: config 
title: Config
sidebar_label: Config
description: Config
keywords: [config]
slug: ../config
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info Backend Config Files

Each service has a config file that is used to specify various parameters 

:::

# Configuration File Options

This document provides a detailed explanation of the configuration options available in the JSON configuration files for each service. First outlined are the parameters that are common to all services, and then the parameters that are specific to each service are outlined.

## Global

The `global` section contains general settings for the application.

An example config may look something like:

```json
  "global": {
    "dryRun": false,
    "networkPrefix": 2,
    "apiEndpoints": [
      "wss://kusama-rpc.polkadot.io"
    ],
    "bootstrap": false,
    "kusamaBootstrapEndpoint": "https://kusama.w3f.community",
    "polkadotBootstrapEndpoint": "https://polkadot.w3f.community",
    "candidatesUrl": "https://raw.githubusercontent.com/w3f/1k-validators-be/master/candidates/kusama.json"
  },
```

- `dryRun`: Boolean (true/false). If set to true, the Nominator accounts that are added will calculate what a nomination would look like (how many and which validators), but not craft or submit any transactions. No nominations will be done when this flag is set. In the `nominate` function of the `Nominator` class, the `dryRun` flag is checked, and if it is set to true, the function will return after logging the validators it would nominate without doing anything. This flag is optional and set to `false` by default.
- `networkPrefix`: Integer. Defines the network prefix. For Kusama, this is `2`, and for Polkadot, this is `0`. It can be set to `3` for running a local test network, although this isn't used much anymore. **This flag is required for `core` and `worker` services.**
- `apiEndpoints`: Array of strings. Lists the RPC endpoints for the chain. When given a list of multiple, it will pick one at random to create a websocket connection to - this single connection is used throughout the entire service for any queries or submitting transactions. **This is required for `core` and `worker` services.**
- `apiPeopleEndpoints`: Optional array of strings. Lists the RPC endpoints for People parachain, if it's enabled on the network. 
- `bootstrap`: Boolean. An **optional** flag that can be set to `true` to enable the bootstrap process. This can be used when running a instance of the backend and would query the main Kusama or Polkadot instances at the api endpoints specified below to populate the db with non-deterministic values like `rank` or `discoveredAt`. _This isn't currently used anywhere yet_
- `kusamaBootstrapEndpoint`: String. URL for the Kusama bootstrap endpoint. **optional**. _This isn't currently used anywhere yet_. 
- `polkadotBootstrapEndpoint`: String. URL for the Polkadot bootstrap endpoint. **optional**. _This isn't currently used anywhere yet_.
- `candidatesUrl`: String. URL to fetch the list of candidates. This should point to a URL that returns a JSON array of candidate objects. **This is required for `core` and for the main production instance points the `candidates.json` files of the respective network that are committed to the `master` branch of this repository on Github.**

## Constraints

An example config may look something like:

```json
  "constraints": {
    "skipConnectionTime": true,
    "skipIdentity": false,
    "skipUnclaimed": false,
    "clientUpgrade": {
      "skip": false
    },
    "minSelfStake": 10000000000000,
    "commission": 150000000,
    "unclaimedEraThreshold": 4
  },
```

The `constraints` section defines validity constraint parameters for validators, as well as options to skip certain checks. These are used in `conststraints.ts`, which is used by both `core` and `worker` when running the valididty checks.

- `skipConnectionTime`: Boolean. Skips checking the 7 day required connection time if set to true. __optional__, defaults to `false`.
- `skipIdentity`: Boolean. Skips the check for a verified identity. __optional__, defaults to `false`.
- `skipUnclaimed`: Boolean. Skips the check for unclaimed rewards. __optional__, defaults to `false`.
- `clientUpgrade.skip`: Boolean. Skips client version upgrade check. __optional__, defaults to `false`.
- `clientUpgrade.forceVersion`: String. Specific client version to be enforced. __optional__, if this is set, it will allow versions >= than what is specified. 
- `minSelfStake`: Integer. Minimum self-stake required. **required**. This number needs to be specified in `Plancks` (1 DOT = 10^10 Plancks, 1 KSM = 10^12 Plancks).
- `commission`: Integer. Max commission rate. **required**. This number needs to be specified in chain units that have 6 decimal places -  for example `150000000`  corresponds to 15% commission. 
- `unclaimedEraThreshold`: Integer. Threshold for unclaimed eras. **required**. A validator having pending rewards for past eras longer than this threshold will be deemed invalid. This gets skipped if `skipUnclaimed` is set to `true`. This number is speciefied as number of eras, so `4` for example means validators are invalid if they have pending rewards older than 4 eras ago.


## Cron

When run as a monolith, `core` will run the various jobs (ie scoring validators, checking their validity, initiating nominations, etc) as repeating cron jobs. The following parameters specify at what time period jobs will repeat, and apply solely to the `core` service. If they are not specified, they will default to the values defined in `constants.ts` in the `common` package.

An example config may look something like:

```json
  "cron": {
"cron": {
"monitor": "0 */15 * * * *",
"clearOffline": "0 0 0 * * 0",
"validity": "0 0-59/10 * * * *",
"execution": "0 0-59/10 * * * *",
"scorekeeper": "0 0-59/10 * * * *",
"rewardClaiming": "0 0-59/10 * * * *",
"cancel": "0 0-59/10 * * * *",
"stale": "0 0-59/10 * * * *",
"eraPoints": "0 0-59/30 * * * *",
"activeValidator": "0 0-59/30 * * * *",
"inclusion": "0 0-59/30 * * * *",
"sessionKey": "0 0-59/30 * * * *",
"unclaimedEras": "0 0-59/30 * * * *",
"validatorPref": "0 0-59/30 * * * *",
"nominator": "0 0-59/1 * * * *",
"delegation": "0 0-59/1 * * * *",
"democracy": "0 0-59/1 * * * *"

},
  },
```



## Database (DB)

This section contains settings related to the database.

An example config (for example when run with `docker compose` where `mongo` in the uri resolves to the endpoint of the container) may look something like:

```json
  "db": {
    "mongo": {
    "uri": "mongodb://mongo:27017"
    }
  },
```

- `mongo`: Object. Contains MongoDB configuration.
    - `uri`: String. MongoDB connection URI. **required**.

## Matrix

Configuration for Matrix bot integration. Although all the following may be specified in a single `main.json` config file, it is recommended to keep the `secret.json` file separate where sensitive information like the access token can be stored.

An example config in `main.json` may look something like:


```json
  "matrix": {
    "enabled": true,
    "baseUrl": "https://matrix.org",
    "room": "!mdugGIKqSTweIOpTlA:web3.foundation",
    "userId": "@1kv-stats:matrix.org"
  },
```

With the following corresponding in a `secret.json` config:

```json
  "matrix":{
    "accessToken": "<access_token>"
  }
```


- `enabled`: Boolean. Enables or disables Matrix integration. **required**.
- `baseUrl`: String. Base URL for the Matrix server. **required if `enabled` is set to `true`**.
- `room`: String. Matrix room identifier. **required if `enabled` is set to `true`**.
- `userId`: String. User ID for Matrix. **required if `enabled` is set to `true`**.
- `accessToken`: String. Access token for Matrix. **required if `enabled` is set to `true`**.

## Proxy

Settings for the staking proxy account that nominators are proxied to. The following only apply for when the proxy account is a time-delayed proxy. For example if the time-delay proxy account has a delay of 18000 blocks (~16 hours), a nomination transaction must first be `announced` by the nominator account, where the call hash of the transaction that should be made is published to the chain. Then after `timeDelayBlocks` blocks have passed, the transaction can be `executed` with another transaction on chain. If a time-delay proxy account is specified in the backend, there is logic that will store the call hash of the nomination transaction as a record database, and then routinely query to see if the currently block is greater than `timeDelayBlocks` of any announcement records. If so, it will then craft and submit the transaction to execute the nomination.

The benefit of having a time-delay proxy is that transactions that are announced may also be cancelled if they are announced but not yet executed. The `blacklistedAnnouncements` array can be used to specify a list of call hashes that should be ignored and not executed. This can be used to blacklist a call hash that was announced but should not be executed.

An example config may look something like:

```json
  "proxy": {
    "timeDelayBlocks": "10850",
    "blacklistedAnnouncements": []
  },
```

- `timeDelayBlocks`: String. Time delay in blocks for the proxy. **optional**, defaults to `18050` if not specified, which corresponds to ~16 hours. The default is specified in `constants.ts` in the `common` package
- `blacklistedAnnouncements`: Array. List of blacklisted announcements. **optional**, only specify when there is a pending announcement that should be cancelled.

## Score

Defines scoring parameters that is used by `constraints.ts` from the `common` package to score validators. `constraints.ts` is imported  and used by both `core` and `worker` services, with the `score` parameters for each service specified in their respective config files. If run as microservices, the `score` parameters for each service should be set to the same values in the `main.json` config file for each service, as both separately will run the scoring methods from `constraints.ts`.

An example config may look something like: 

```json
  "score": {
    "inclusion": "200",
    "spanInclusion": "200",
    "discovered": "5",
    "nominated": "30",
    "rank": "5",
    "bonded": "50",
    "faults": "5",
    "offline": "2",
    "location": "40",
    "region": "10",
    "country": "10",
    "provider": "100",
    "nominations": "100",
    "delegations": "60",
    "openGov": "100",
    "openGovDelegation": "100",
    "rpc": "100",
    "client": "100",
    "useInclusion": true,
    "useSpanInclusion": true,
    "useDiscovered": true,
    "useNominated": true,
    "useRank": true,
    "useBonded": true,
    "useFaults": true,
    "useOffline": true,
    "useLocation": true,
    "useRegion": true,
    "useCountry": true,
    "useProvider": true,
    "useNominations": true,
    "useDelegations": true,
    "useOpenGov": true,
    "useOpenGovDelegation": true,
    "useRpc": true,
    "useClient": true
  },
```

- Each parameter (`inclusion`, `spanInclusion`, `discovered`, etc.) has a numeric value, which contributes to the overall scoring algorithm. 
- **All numeric weight parameters are optional, although are suggested to be specified**. If they are not specified they will default to the values defined in `constants.ts` in the `common` package.
- `useInclusion`, `useSpanInclusion`, `useDiscovered`, etc. are boolean values that indicate if the corresponding parameter should be used in the scoring algorithm. If set to `false`, the corresponding parameter will not be used in the scoring algorithm. **All parameters are optional, although are suggested to be specified**. If they are not specified they will all default to `true`, as defined in `constants.ts` in the `common` package.


## Scorekeeper

Scorekeeper is the main process run solely in `core` that will initiate the various jobs to be run (ie scoring validators, checking their validity, initiating nominations, etc), which are run either as repeating cron jobs if run as a monolith, or `scorekeeper` will add these jobs to a bull queue if run as a microservice (which `workers` run in separate containers will pick up and run). The following parameters will apply solely to the `core` service, however, as `scorekeeper` is only run in `core`. 

### Candidates

The list of candidates may be specified by in the `scorekeeper` section of the config if the `candidatesUrl` is not specified in the `global` section. If the `candidatesUrl` is specified in the `global` section, the `candidates` section in the `scorekeeper` section will be ignored.

When `core` is started, it will first get the list of candidates in the db, clean old fields, set every stash to `null`, then add the list of candidates from the json. 

Kusama example:

```json
{
  "candidates": [
    {
      "name": "Blockshard",
      "stash": "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
      "riotHandle": "@marc1104:matrix.org"
    },
    {
      "name": "🎠 Forbole GP01 🇭🇰",
      "stash": "D9rwRxuG8xm8TZf5tgkbPxhhTJK5frCJU9wvp59VRjcMkUf",
      "riotHandle": "@kwunyeung:matrix.org",
      "skipSelfStake": true
    },
    ... 
    ]
}
```


Polkadot Example:

```json
  "candidates": [
    {
      "name": "specialized-tarmac-2",
      "stash": "1NDRMvN7FH9YtJLVPf9doF5zbuUwn6hdH1b4WmVyZDr5joM",
      "kusamaStash": "HngUT2inDFPBwiey6ZdqhhnmPKHkXayRpWw9rFj55reAqvi",
      "riotHandle": "@joe:web3.foundation"
    },
    {
      "name": "🔒stateless_money🔒 / 1",
      "stash": "14Vh8S1DzzycngbAB9vqEgPFR9JpSvmF1ezihTUES1EaHAV",
      "kusamaStash": "HZvvFHgPdhDr6DHN43xT1sP5fDyzLDFv5t5xwmXBrm6dusm",
      "riotHandle": "@aaronschwarz:matrix.org",
      "skipSelfStake": true
    },
    ...
    ]
}
```

- `name`: String. Telemetry node name of the candidate. **required**. This must correspond **exactly** to the telemetry node name of the candidate, from the telemetry endpoint / chain that is used by the `telemetry` service.
- `stash`: String. Stash address of the candidate. **required**.
- `kusamaStash`: String. Kusama stash address of the candidate. **optional** for kusama, **required** for polkadot. This is only for the Polkadot instance where the validity and rank of the kusama validator is also checked in order for the Polkadot validator to be deemed valid.
- `riotHandle`: String or String Array. Matrix handle of the candidate. **required**. This may also be an array of strings for validators that have multiple Matrix handles.
- `skipSelfStake`: Boolean. Skips the check for self-stake. **optional**, defaults to `false`. This should be set to `true` for validators that have an acceptable Case for Good Intentions.

### Nominators

Multiple nominators may be specified in the `scorekeeper` section of the config. A nominator may either be the Nominator stash/controller itself (**NOT RECOMMENDED**) or a Nominator that has a Staking proxy to the account listed in the config. Since there needs to be an account that signs and submits transactions, the seed of an account needs to be added - ideally this is the seed of a proxy account that has a time delay. For that reason the `nominators` section of the config should ideally be specified in a separate `secret.json` config file, although can be in a single `main.json` config file if desired.

An example config in `secret.json` or `main.json` may look something like:

```json
    "nominators": [
      [
        {
          "seed": "raw security lady smoke fit video flat miracle change hurdle potato apple",
          "isProxy": true,
          "proxyFor": "5DvJnBAoDs1DibZ2pAsVA6FK42sDjA7P1vjEXaDBq7UwuMbZ",
          "proxyDelay": 35
        }
      ],
      [
        {
          "seed": "correct essay panda fence olympic control sorry post ski hurt athlete ritual",
          "isProxy": true,
          "proxyFor": "5HGULWbEMfFeD1c5nqQbzZa1gTrVdHAv396J2UHmmMpbdd3x",
          "proxyDelay": 35
        }
      ],
      [
        {
          "seed": "neither seminar equip split horn city weapon bike brown muscle coast ski",
        }
      ],
    ]
```
    
- `seed`: String. Seed of the account signing txs on behalf of the nominator. **required**. This is ideally a seed of a proxy account that has a time delay.
- `isProxy`: Boolean. Indicates if the specified seed is a proxy account. **required**.
- `proxyFor`: String. Stash address of the account that the specified signer is a proxy for. **required** if `isProxy` is set to `true`.
- `proxyDelay`: Integer. Time delay in blocks for the proxy. **optional**, defaults to `18050` if not specified, which corresponds to ~16 hours. The default is specified in `constants.ts` in the `common` package.


### Claimer

The `claimer` section of the config is used to specify the seed of the account that will claim rewards for the nominators. This is the seed of an account that will sign transactions to claim rewards for any candidate that has rewards older than the `unclaimedEraThreshold` parameter specified in the `global` section of the config. The seed of the account that will claim rewards should be specified in a separate `secret.json` config file, although can be in a single `main.json` config file if desired.

An example config in `secret.json` or `main.json` may look something like:

```json
  "claimer": {
    "seed": "raw security lady smoke fit video flat miracle change hurdle potato apple"
  },
```

- `seed`: String. Seed of the account that will claim rewards. **optional**.

### Scorekeeper

Besides the `candidates`, `nominators`, and `claimer` sections, the following parameters may also be specified in the `scorekeeper` section of the config. These may go in the `main.json` config file,. 

An example config in `main.json`:

```json
  "scorekeeper": {
    "forceRound": false,
    "nominating": true
  },
```

The format 

- `forceRound`: Boolean. upon `scorekeeper` starting, will initiate new nominations immediately, regardless of the time since the last nomination. **required**, defaults to `false`. This can be useful to do nominations when there are issues with proxy transations getting stuck for example.
- `nominating`: Boolean. Indicates whether the nominator account will create and submit transactions or not. **required**. Nominators will only submit transactions when this is set to `true`, otherwise when a nomination is supposed to occur the process will not do anything when set to `false`.

## Redis

Configuration for Redis. Redis is used when run as microservices for messages queue passing. When run as a monolith it is not used and not required. When run as microservices, `core`, `gateway`, and `worker` will need to have their own redis parameters specified in their respective config files.

An example config may look something like:

```json
  "redis": {
    "enable": true,
    "host": "redis",
    "port": 6379
  },
```

- `enable`: Boolean. Enables or disables Redis. **optional**. defaults to `false if not specified
- `host`: String. Redis host. **required** if run as microservices, **optional** if not.
- `port`: Integer. Redis port. **required** if run as microservices, **optional** if not.

## Server

THe `gateway` package uses Koa to serve various db queries from specified endpoints. `gateway` may either be run as a monolith or as a microservice. If run as a microservice, the `gateway` service will need to have its own `server` parameters specified in its config file. 

An example config may look something like:

```json
  "server": {
    "enable": true,
    "port": 3000
  },
```

- `enable`: Boolean. Enables or disables the server.
- `port`: Integer. Port for the server.

## Telemetry

Information about candidates relating to their uptime, node version, location, and hardwware specs is gotten from subscribing to websocket messages from a specified telemetry endpoint. Node names from `candidates` are matched with messages from `telemtry` to correlate this information. The `telemetry` client may run either as part of `core` when run as a monolith, or as a separate service when run as microservices. 

Information relating to location and hardware may optionally be gotten and queried from `ipinfo` if an api key is specified. This should ideally be specified in a separate `secret.json` config file, although can be in a single `main.json` config file if desired.

Location and provider information is used to determine the `locationScore` and `providerScore` parameters in the `score` section of the config. Providers may be blacklisted if desired, if a provider is blacklisted, the `providerScore` for that provider will be set to `0`.

An example config in `main.json` may look like: 

```json
  "telemetry": {
    "blacklistedProviders": [
      "Hetzner Online GmbH",
      "Contabo Inc.",
      "Contabo GmbH"
    ],
    "enable": true,
    "chains": [
      "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"
    ],
    "host": "wss://telemetry-backend.w3f.community/feed"
  }
```

Settings for telemetry.

- `blacklistedProviders`: Array of strings. Lists blacklisted providers. **optional**.
- `enable`: Boolean. Enables or disables telemetry. **required**.
- `chains`: Array of strings. Lists the chains for telemetry. **required**. The string corresponds to the genesis hash of the chain. For Kusama, this is `0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe`, and for Polkadot, this is `0x0000000 for example
- `host`: String. Host for telemetry backend. **required**.

An example config in `secret.json` or `main.json` may look like: 

```json
  "ipinfo": {
    "apiKey": "<api_key>"
  }
```

- `apiKey`: String. API key for ipinfo. **optional**.

----

# Service Config Examples:


## Core Config 

An example `core` config run as microservices may look something like:

```json
{
  "global": {
    "dryRun": false,
    "networkPrefix": 2,
    "apiEndpoints": [
      "wss://kusama-rpc.polkadot.io"
    ],
    "bootstrap": false,
    "kusamaBootstrapEndpoint": "https://kusama.w3f.community",
    "polkadotBootstrapEndpoint": "https://polkadot.w3f.community",
    "candidatesUrl": "https://raw.githubusercontent.com/w3f/1k-validators-be/master/candidates/kusama.json"
  },
  "constraints": {
    "skipConnectionTime": true,
    "skipIdentity": false,
    "skipUnclaimed": false,
    "clientUpgrade": {
      "skip": false
    },
    "minSelfStake": 10000000000000,
    "commission": 150000000,
    "unclaimedEraThreshold": 4
  },
  "db": {
    "mongo": {
      "uri": "mongodb://mongo:27017"
    },
  },
  "matrix": {
    "enabled": false,
    "baseUrl": "https://matrix.org",
    "room": "!mdugGIKqSTweIOpTlA:web3.foundation",
    "userId": "@1kv-stats:matrix.org"
  },
  "proxy": {
    "timeDelayBlocks": "10850",
    "blacklistedAnnouncements": []
  },
  "score": {
    "inclusion": "200",
    "spanInclusion": "200",
    "discovered": "5",
    "nominated": "30",
    "rank": "5",
    "bonded": "50",
    "faults": "5",
    "offline": "2",
    "location": "40",
    "region": "10",
    "country": "10",
    "provider": "100",
    "council": "50",
    "democracy": "100",
    "nominations": "100",
    "delegations": "60",
    "openGov": "100",
    "openGovDelegation": "100"
  },
  "scorekeeper": {
    "forceRound": false,
    "nominating": false
  },
  "redis": {
    "enable": true,
    "host": "redis",
    "port": 6379
  },
  "server": {
    "enable": false,
    "port": 3300
  },
  "telemetry": {
    "blacklistedProviders": [
      "Hetzner Online GmbH",
      "Contabo Inc.",
      "Contabo GmbH"
    ],
    "enable": false,
    "chains": [
      "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"
    ],
    "host": "wss://telemetry-backend.w3f.community/feed"
  }
}

```

#@ Gateway Config 

An example gateway config run as microservices may look something like:

```json
{
  "db": {
    "mongo": {
      "uri": "mongodb://mongo:27017"
    }
  },
  "redis": {
    "enable": true,
    "host": "redis",
    "port": 6379
  },
  "server": {
    "enable": true,
    "port": 3301,
    "cache": 1800
  }
}

```

## Telemetry Config

An example telemetry config run as microservices may look something like: 

```json
{
  "db": {
    "mongo": {
      "uri": "mongodb://mongo:27017",
    }
  },
  "telemetry": {
    "blacklistedProviders": [
      "Hetzner Online GmbH",
      "Contabo Inc.",
      "Contabo GmbH"
    ],
    "enable": true,
    "chains": [
      "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"
    ],
    "host": "wss://telemetry-backend.w3f.community/feed"
  }
}

```

# Worker Config

An example Worker config run as microservices may look something like: 

```json
{
  "global": {
    "apiEndpoints": [
      "wss://kusama-rpc.polkadot.io",
      "wss://kusama-rpc.dwellir.com",
      "wss://kusama.public.curie.radiumblock.xyz/ws"
    ]
  },
  "db": {
    "mongo": {
      "uri": "mongodb://mongo:27017"
    }
  },
  "score": {
    "inclusion": "200",
    "spanInclusion": "200",
    "discovered": "5",
    "nominated": "30",
    "rank": "5",
    "bonded": "50",
    "faults": "5",
    "offline": "2",
    "location": "40",
    "region": "10",
    "country": "10",
    "provider": "100",
    "nominations": "100",
    "delegations": "60",
    "openGov": "100",
    "openGovDelegation": "100",
    "rpc": "100",
    "client": "100",
    "useInclusion": true,
    "useSpanInclusion": true,
    "useDiscovered": true,
    "useNominated": true,
    "useRank": true,
    "useBonded": true,
    "useFaults": true,
    "useOffline": true,
    "useLocation": true,
    "useRegion": true,
    "useCountry": true,
    "useProvider": true,
    "useNominations": true,
    "useDelegations": true,
    "useOpenGov": true,
    "useOpenGovDelegation": true,
    "useRpc": true,
    "useClient": true
  },
  "redis": {
    "enable": true,
    "host": "redis",
    "port": 6379
  }
}

```
