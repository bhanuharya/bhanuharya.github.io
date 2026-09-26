---
layout: post
title: "What happens when I revoke an agent's access"
date: 2026-09-21 05:50:00 +0700
author: bhanuharya
tags: [agents, security, access-control, self-hosting]
description: >-
  Grant, credential, and connection clocks run separately when agent access is revoked. A design question and lab plan for the late effects.
---

I want an agent to compare migration files with staging and report what's missing. For that job it needs database access. The hard part is stopping it: once a task is revoked, can work already admitted still change the database? I have not tested this yet. This post is the design question and a small lab plan.

## Three clocks

One grant starts three separate timers:

| Clock | Example |
|---|---|
| Grant | this task may touch this service until Friday |
| Credential | password or token with its own expiry |
| Connection | TCP session, transaction, query already running |

They stop separately:

* A grant can end while the credential still works.
* A credential can expire while the connection stays open.
* A database finishes a query it already accepted. The result can land after the revoke was reported done.

The runtime I have been building tracks this as five separate events:

![What the word revoked hides](/assets/img/revoked-lifecycle.svg)

*One status word, four separate events. Late effects land in the last box.*

I trust one sentence here: "admission closed and no sessions remain". A status line that says revoked packs four open questions into one word.

## Where each control stops

### Secrets manager: custody

It decides who may read which secret. A Vault-shaped issuer can mint a short-lived database credential per task. That beats a long-lived password in an environment variable.

What it leaves open: the effect. A lease says when a credential dies. It says nothing about the query accepted a second earlier, or whether the task still gets its answer.

One more wrinkle in the same spot. Short-lived credentials for PostgreSQL ride on password authentication. If the fix is to move off password authentication, the clock I relied on may stop being the thing that enforces anything.

### Gateway: admission

It sees a request, checks policy, forwards or refuses. The one I read checks HTTP method and path against a per-provider allowlist. A permitted host still needs a permitted operation.

The boundary: it decides at admission and the work lands later. Closing the door stops future admissions. Everything already inside keeps going.

### Sandbox: reachability

The strongest setup I have read about: the agent container gets no network interface, drops every Linux capability, and mounts two Unix sockets for tool calls and model calls. Nothing else is reachable. The project aborts startup when the connectivity check fails, so it never slides quietly into a weaker mode.

The edge: the same screen that keeps the agent out of my network keeps it out of my test stack when the fixture resolves to loopback or a private range. The code says so directly. A fixture on loopback needs a specific option before it becomes reachable at all. So the adapter has to live somewhere the declared route permits, and that place can be awkward.

## Two escape hatches

The same project documents one relaxation and ships another in code:

| Hatch | What it does |
|---|---|
| Env flag for trusted environments | Proxy treats any unknown host as a passthrough tunnel. Applies to all three host checks. |
| Test-only option for loopback fixtures | Settable only by code that builds the proxy itself. Turns the address screen off. |

With the second one set, any claim that the agent cannot reach an undeclared route stops holding. The failure is quiet: the lab works better, the boundary disappears, results look the same.

## Checking the citation

I treat "the code does this, at this file and line" as unverified until I fetch the source and grep the identifier. Here that turned up three kinds of rot:

1. Line moved. Stale, easy fix.
2. Identifier gone or renamed. The mechanism my plan relied on is absent from the version I would pin. Design problem.
3. Citation never existed. The expensive one, usually inside an otherwise careful document.

The habit that paid off: go to the enforcement site, the place that decides behaviour. A type existing proves nothing. In the gateway I read, the endpoint filter is declared in one file and called in the mitm proxy, on the request path, right before the credential swap. Stopping at the declaration gives a sentence that is true and misleading.

```bash
# five mentions in the tree, and one place that decides anything
$ grep -rn "isEndpointAllowed" src --include="*.ts" | wc -l
5
$ grep -rn "isEndpointAllowed(provider.config" src --include="*.ts"
src/docker/mitm-proxy.ts:1105:    if (!isEndpointAllowed(provider.config, method, path)) {
```

Five hits. Two are comments and one is an import. Exactly one runs on the request path. That is the one that decides whether the filter means anything.

## What would settle it

Reading gives a hypothesis and seams worth testing. It cannot say whether a stopped grant still lands an effect. That is the question the post turns on.

![Where the authority sits, and where a stop acts](/assets/img/authority-map.svg)

*The roles and the claim under test. A stop acts at the gateway, the effect lands at the service, the direct attempt from the sandbox is run as a case, and the observer is a separate process the task cannot see.*

Small lab on purpose. One issuer, one service, one observer. Six rules for whether it can tell me anything:

* write down what each case should show before running it
* include a permitted operation that must succeed, so a later denial reads as policy
* keep the four lifecycle events separate
* observe from a process outside the one under test
* mark inconclusive cases as inconclusive, keep them out of the story
* run the direct attempt as a control, since topology is no substitute for watching it fail

The gateway earns its place once the small version produces something that needs it. Added first, it spends the budget on plumbing and reaches the interesting question late.

## Where this stands

I have only read the docs and source at one revision. I have not pinned a release or run the lab, so I do not know whether an admitted operation can land after access is pulled. That is the next thing to test.
