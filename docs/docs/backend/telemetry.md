---
id: telemetry
title: Telemetry
sidebar_label: Telemetry
description: Telemetry Documentation
keywords: [telemetry]
slug: ../teleemtry
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info `Telmetry` package

A telemetry client that monitors uptime, client version, and other metrics.

:::

# Overview

When running a substrate node, it will give various info and metrics to a telemtry instance. This is a client that will subscribe to a telemetry instance and listen for websocket messages that correspond to things like new blocks, nodes added, their version, client type, hardware specs, etc.

The telemetry client may either be run within `core` as a monolith, or separately as it's own service when run as microservices. 

The sole functionality of the telemetry client is to subscribe to messages from the telemetry instance, decode them, and for a few kinds of messages, update some values in the database.