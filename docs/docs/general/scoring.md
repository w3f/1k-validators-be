---
id: scoring
title: Scoring
sidebar_label: Scoring
description: Scoring
keywords: [scoring]
slug: ../scoring
---

import { ProgrammeName } from '../../components/ProgrammeName';

:::info <ProgrammeName/> Scoring

Validator selection and scoring information.

:::


In order to determine which subset of nodes to nominate with added nominator accounts, nodes are scored based on a set of configurable weights, with the top _x_ amount of nodes (ordered by their total score) are nominated (depending on the number of nominator accounts and their bonded balances). The following outlines some of the scoring factors and mechanisms used to determine the score of a node.

:::info Subject to Change

Note: these factors may change at any time, and are configurable. They are generally driven by feedback of the community and the needs of the program.

:::

## Validator Selection - Decentralization, Engagement, Opportunity, and Reputation

Choosing which Validators to nominate with accounts tries to balance a few different factors. If one looks at on-chain staking data alone, there's not quite as many factors for making decisions. For the benefit of both nominator accounts, as well to encourage validators to be more engaged, factors outside of on-chain staking data are considered, such as location, data center provider, frequency of being in the validator set, downtime, interactions with governance, and more.

For validators, especially ones that might be just starting out, it helps to be able to build one's own brand and reputation, which can help gain exposure, earn trust, and allow nominators to be able to back entities that are more than just an on-chain address, that contribute positively to decentralizing the network and engaging with the ecosystem. 

To aid in promoting decentralization, there are configurable scoring factors for the location, region, and provider of the node, which is gotten from telemetry. For these factors, nodes that are running in more unique locations, regions, and providers have a higher score. 

There are additional scoring factors related to engagement that are configurable. There is a `nominations` weight, which is higher for the amount and number of nominators a validator has, which can help choose and select validators that are doing their part to work towards self-sustainability in attracting additional nominators.

As part of building one's own brand and reputation, participating in governance is one way to become more known amongst the community, and as such there's an `openGovDelegation` and `openGov` weight. Having a higher number of governance delegations, and consistently voting on governance proposals will increase the score for these factors. Having someone delegate their governance vote means that they trust their delegate with their decision making process in governance, and one can help build their own brand and reputation by providing value to the ecosystem via their governance participation. For `openGov` scoring, this is higher for the amount of votes a validator has (also adjusted for when they started participating in voting), although it does not matter with how much they vote, which vote direction they make (`aye`, `nay`, or `abstain`), nor whether they vote themselves or their vote lands on chain because they delegate to someone else. As such if someone does not care as much to be involved in governance, they can still earn a higher score by delegating their vote to someone else, as there are many people in the community that consistently and thoughtfully vote in governance. The balance of these factors is to promote validators to be engaged in governance as value-providing delegates that also attract delegations from others (as ideally they are voting and participating in a way that their delegators approve of), or to encourage validators to back other validators or ecosystem participants that are engaged in governance. 

For validators just starting out that may not have additional nominators, exposure, or are in the active set much (or at all), there is a `inclusion` and `spanInclusion` weight, which gives a higher score for validators that have a low amount of times being in the active set. `inclusion` looks at the past 84 eras, while `spanInclusion` looks at the past 28 eras. If a validator is not in the set as much within those time periods they will have a higher score for these factors. This also encourages a rotation of nominations, so that the nominator accounts will back validators that may not be continuously in the validator set (or may be self-sufficient in nominations). This can help allow new validators the opportunity to get in the set and attract additional nominators, and give them a starting point to build their brand and reputation.

## Scoring Factors and Calculation

**Only validators that are in the `valid` state (that is the currently fulfill all the configurable checks and requirements) have their scores calculated and updated**. In general, all scores are calculated relative to other validators that are in this `valid` subset. For something like bonded amount for example, there is no absolute amount that will get the highest total score for this factor. The highest scores will be validators that have high amounts bonded compared to other `valid` validators. There is additionally a buffer amount (for example 10%) as to not skew the scores too much where validators have a very high or low value for whatever the given scoring factor is.

Each scoring factor may be a little different depending on what it is, but in general the score is calculated by looking at the distribution of values for the set of validators (for example, there might be bonded amounts of 1, 3, 5, 10, 15, 100), and a value will assigned to where a validator's value falls in that distribution. This value is then multiplied by the weight for this scoring factor (if the configured bonded weight is 100 for example), to get the score (so a validator can have a total score of 100 for bonded amount if they fall within the top 10% of values, if that's what the buffer is). 

A validator's total score is then the sum of all the individual scoring factors.

### Inclusion

`Inclusion` is inversely scored based on the number of times the validator has been in the active set in the **past 84 eras**. The more times a validator has been in the active set, the lower the score for this factor. This is to encourage a rotation of nominations, so that the nominator accounts will back validators that may not be continuously in the validator set (or may be self-sufficient in nominations). This can help allow new validators the opportunity to get in the set and attract additional nominators, and give them a starting point to build their brand and reputation.

### Span Inclusion

`SpanInclusion` is inversely scored based on the number of times the validator has been in the active set in the **past 28 eras**. The more times a validator has been in the active set, the lower the score for this factor. This is to encourage a rotation of nominations, so that the nominator accounts will back validators that may not be continuously in the validator set (or may be self-sufficient in nominations). This can help allow new validators the opportunity to get in the set and attract additional nominators, and give them a starting point to build their brand and reputation.

### Discovered

Validators must connect to a dedicated telemetry instance. The timestamp that a node with a given name is stored in the database, and this is used to determine the score for this factor. The earlier a node is discovered, the higher the score for this factor.

### Nominated

`Nominated` is based on the timestamp of the last time the node was nominated via one of the nominating accounts. The older the last nomination, the higher the score (and the more recent, the lower the score). This is also to encourage a rotation of nominations. 

### Rank

A validator will have a given rank value, where it increases by 1 for each day that a validator was in the validator set. The higher the better for this scoring factor. 

### Bonded

The amount of self-bond a validator. The higher the better.

### Faults

A validator will get a `fault` event if they receive an on-chain offline event (that is they do not produce a block or submit an `imonline` heartbeat within a session). The higher the amount of faults, the lower the score for this factor. 

### Offline

Since validators need to connect to a dedicated telemetry instance, offline time is kept track of, as by the amount of time between disconnecting from telemetry and connecting again. The higher the amount of offline time, the lower the score for this factor. The offline time resets to 0 after a configured amount of time (for example 24 hours), so that validators that are offline for a long time do not get penalized too much for this factor.

### Location

Location data is gotten via [ipinfo](https://ipinfo.io/) from information from telemetry. The location is scored based on the number of validators that are in the same location. The more unique the location (the less number of other `valid` nodes that are in the same location), the higher the score for this factor.

### Region

Region data is gotten via [ipinfo](https://ipinfo.io/) from information from telemetry. The region is scored based on the number of validators that are in the same region. The more unique the region (the less number of other `valid` nodes that are in the same region), the higher the score for this factor.

### Country

Country data is gotten via [ipinfo](https://ipinfo.io/) from information from telemetry. The country is scored based on the number of validators that are in the same country. The more unique the country (the less number of other `valid` nodes that are in the same country), the higher the score for this factor.

### Provider

Provider data is gotten via [ipinfo](https://ipinfo.io/) from information from telemetry. The provider is scored based on the number of validators that are using the same provider. The more unique the provider (the less number of other `valid` nodes that are using the same provider), the higher the score for this factor.

### Nominations

The amount of nominators, and the total bonded amounts from those nominators, that have nominated the validator. The higher the better.

### OpenGov Delegations

The amount of open gov delegations, and the total delegated amounts from those delegators, that have delegated their open gov votes the validator (for any and all given tracks). The higher the better.

### OpenGov

The `OpenGov` score is calculated based on the number of votes a validator has made in governance for _finished referenda_. **All votes are treated the same, it does not matter if it is from delegating to someone else or casting themselves, nor the amount / conviction voting with, nor the vote direction (`aye`, `nay`, or `abstain`)**. There is a base score that is calculated for the number of votes, as well as a `consistency` multiplier that is then applied (which is based on the number of consecutive referenda a validator has voted on). This allows validators to still be able to get a higher score if they haven't been around for a while and only now start delegating or voting themselves. 