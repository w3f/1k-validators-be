---
id: gateway
title: Gateway
sidebar_label: Gateway
description: Gateway Documentation
keywords: [gateway]
slug: ../gateway
---

import { ProgrammeName } from '../../components/ProgrammeName';


:::info `Gateway` package

An REST API gateway with endpoints that query the db. 

:::

# Overview

The `gateway` package is a Koa server that exposes the backend with a REST API. It is responsible for querying the database and returning the results in a JSON format.

It can either be run as a monolith, or as a microservice. When run as a monolith, it will be run inside `core`, and when run as a microservice, it will be run as a separate `gateway` instance (which can be horizontally scaled and load balanced).