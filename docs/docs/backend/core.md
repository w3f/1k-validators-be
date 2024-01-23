---
id: core
title: Core
sidebar_label: Core
description: Core Package Documentation
keywords: [backend]
slug: ../core
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info <ProgrammeName/> Backend Core

Core Package

:::

# Overview

The following is an overview of the `Core` package in the backend. It contains, among other things, `scorekeeper`, which is the main orchestrator of initiating jobs to be run, as well as the workflows for nominations.


## Running

When Core is run, depending on whether the backend is run as a monolith or as microservice, it will run different things on startup. Regardless, it will mainly run the `scorekeeper`, which deals with the workflows for nominations. When run as a monolith it will additionally run the gateway api service, as well as the telemetry service and all job. If run a microservices, the gateway and telemetry services will be run separately, as well as some jobs (although core is what will initiate the jobs to be run in the job queue).

Upon startup, `core` will add all the candidates from a given candidate file, clean some data that may be old, and begin running the `scorekeeper`. 

## Scorekeeper

`Scorekeeper` is the main runnable file in the `core` package. It is responsible for orchestrating the jobs that need to be run, and for running the workflows for nominations.

Some of the main workflow for `scorekeeper`, besides queueing up jobs, are checking whether it is a new round and time to initiate new nominations. Whenever a nomination 




