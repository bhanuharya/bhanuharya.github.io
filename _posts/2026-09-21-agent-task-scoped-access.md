---
layout: post
title: "Handing an agent a database credential"
date: 2026-09-21 05:50:00 +0700
author: bhanuharya
tags: [agents, security, access-control, self-hosting]
---

I have a job I would like to hand to an agent: compare a set of local migration files against the versions recorded in a staging database, and tell me which ones are missing. It reads one view, compares, and writes a short report.

Doing that needs two things I would rather not hand an agent, a credential for the database and a network route to it. The advice I keep meeting takes three forms. Give the agent a scoped credential. Put a proxy in front of the service. Put the agent in a sandbox that cannot reach anything else. Each one is a real control, and none of them answers my actual question, which is what happens to work already in flight when I take the access away.

## Three clocks

Granting access for a job starts three clocks at once. The grant is my decision that this task may touch this service until some deadline. The credential is whatever the issuer handed out, carrying its own expiry. The connection is a TCP session, a transaction, a query the database is already running.

They stop at different times. A grant can end while the credential is still valid. A credential can expire while the connection sits open and usable. A database will finish a query admitted before the revocation, and the result can land after the revocation was reported done.

The runtime I have been building keeps five observable events for this, and they are not interchangeable:

```text
what the word "revoked" hides

  stop requested
        |
        v
  +-----------+  +-----------+  +-----------+  +-----------+
  | admission |  | credential|  | sessions  |  | cleanup   |
  | closed    |  | rejected  |  | gone seen |  | accounted |
  +-----------+  +-----------+  +-----------+  +-----------+
        \             |             |             /
         +------------+-------------+------------+
                             |
        a query admitted before the first box
        can still deliver a result down here
```

The sentence I can stand behind is "admission closed and no sessions remain". A status line that says revoked hides four questions behind one word, and at least one of them is usually still open.

## Where each control stops

A secrets manager answers custody. It decides who may read which secret, and a Vault-shaped issuer can mint a short-lived database credential per task, which beats a long-lived password sitting in an environment variable. What it cannot tell me is what the effect is. A lease says when a credential dies. It says nothing about the query admitted a second earlier, or about whether the task still gets its answer.

There is a second problem in the same place. The expiry binding that makes short-lived credentials work for PostgreSQL rides on password authentication, so if the fix is to stop using password authentication, the clock I was relying on may no longer be the thing enforcing anything.

A gateway answers admission. It sees a request, checks it against policy, and forwards or refuses. The one I read validates the HTTP method and path against a per-provider allowlist, so a permitted host does not imply a permitted operation. The limit is structural, since the gateway decides at admission and the work lands afterwards, so closing the door closes future admissions and leaves everything already inside alone.

A sandbox answers reachability. The strongest arrangement I have read about gives the agent container no network interface, drops every Linux capability, and mounts two Unix sockets it may use for tool calls and model calls. Nothing else is reachable, and the project aborts initialization when the connectivity check fails, so there is no quiet fallback to a weaker configuration.

That boundary has edges. If the fixture I want the agent to reach resolves to loopback or a private range, the same screen that keeps the agent out of my network keeps it out of my test stack, and the code says so: a fixture resolving to loopback needs a specific option set before it is reachable at all. That decides the shape of the design, because the adapter has to live somewhere the declared route permits, and that place may be awkward.

## Two escape hatches

The same project documents one relaxation of that screen and ships another in code.

The documented one is an environment flag that makes the proxy treat any unknown host as a passthrough tunnel. It is described as suitable for trusted environments, and it applies to all three host checks.

The second is an option named for tests, described in the source as a test-only escape hatch for loopback fixtures. Nothing in user configuration reaches it. A lab that constructs the proxy itself can set it, and with it set the address screen is off, which means any claim that the agent cannot reach an undeclared route stops being true in that condition. The failure mode is quiet, because the lab works better, the boundary disappears, and the results look the same.

## Checking the citation

I now treat every claim of the form "the code does this, at this file and line" as unverified until I have fetched that source and grepped for the identifier. Doing it here turned up three problems, and only one of them was cosmetic. A line number can move, which is stale and easy to fix. An identifier can be gone or renamed, which means the mechanism my plan was built on does not exist in the version I am about to pin, and that is a design problem. A citation can never have existed, which is the expensive one, and it usually arrives inside a document that is otherwise careful.

The habit that has paid off more often is checking the enforcement site rather than the declaration. A type or a function existing proves nothing about behaviour. In the gateway I read, the endpoint filter is declared in one file and actually called in the mitm proxy, on the request path, right before the credential swap. Stopping at the declaration would have given me a sentence that was true and misleading.

```bash
# five mentions in the tree, and one place that decides anything
$ grep -rn "isEndpointAllowed" src --include="*.ts" | wc -l
5
$ grep -rn "isEndpointAllowed(provider.config" src --include="*.ts"
src/docker/mitm-proxy.ts:1105:    if (!isEndpointAllowed(provider.config, method, path)) {
```

Five hits, two of them comments and one an import. Exactly one runs on the request path, and that is the one that decides whether the filter means anything.

## How I would find out

Reading gets me a defensible hypothesis and a set of testable seams. It does not tell me whether a stopped grant can still land an effect, which is the question worth answering, so the plan is a measurement first.

![Where the authority sits, and where a stop acts](/assets/img/authority-map.png)

*The roles, and the claim under test. A stop acts at the top of that flow, the effect lands at the service, the direct attempt from the sandbox is tested as a case, and the observer is a separate process that the task cannot see.*

The shape I settled on is deliberately small: one issuer, one service, one observer. Freeze the expected outcome for each case before running anything, because an expectation written afterwards is a description. Include a calibration case where a permitted operation must succeed, so a later denial cannot be confused with a broken lab. Separate the lifecycle events, since one verdict hides the ordering. Observe from a process that is not the one under test. Mark any case that cannot separate two events as inconclusive and do not merge it into a story. Record the negative controls, including an actual attempt to reach the service directly, because inferring that from the topology is not the same as watching it fail.

The gateway only earns its place once the small version produces something that needs it. Adding it first spends the budget on plumbing and arrives at the interesting question late.

## What I have not run

Nothing here has been run. No component is installed, no version is pinned, and every third-party statement above is documentation and source reading at one revision, which is a pointer and not evidence about the release I would actually use. One gateway having a particular endpoint filter and a particular pair of escape hatches says nothing about the category either, and one realization of a lab says nothing general.

If the native controls close the gap once they are configured carefully, the honest output is a recipe and a negative result. I wrote that exit into the plan along with the conditions that trigger it, because the alternative is a project that keeps going to justify itself.

I am still exploring this. The next step is deliberately unexciting: pin the versions, write down what each case should show before running anything, and get one honest measurement out of an issuer, a service and an observer. Whatever it says, the measurement is the part worth publishing. More when I have it.
