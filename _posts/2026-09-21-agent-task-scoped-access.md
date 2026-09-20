---
layout: post
title: "Task-scoped access to private infrastructure, and where it leaks"
date: 2026-09-21 05:50:00 +0700
author: bhanuharya
tags: [agents, security, access-control, self-hosting]
---

I have a job I would like to hand to an agent: compare a set of local migration files
against the versions recorded in a staging database, and tell me which ones are missing.
It reads from one view, compares, and writes a short report. That is the whole task.

The job itself is small. What makes it interesting is that doing it requires two things I
do not want to give an agent: a credential for the database, and a network route to it.
Everything I have read about agent security this year circles that gap, and the answers I
keep meeting come in three shapes: a scoped credential for the agent, a proxy in front of
the service, or a sandbox that cannot reach anything else. Each of those is a real
control. None of them answers the question I actually care about, which is what happens to
work that is already in flight when I take the access away.

## Three clocks

When you give an agent access for a job, you are really starting three clocks at once.

The first is the grant: my decision that this task may touch this service, until some
deadline. The second is the credential: whatever the issuer handed out, carrying its own
expiry. The third is the connection: a TCP session, a transaction, a query that a database
is already executing.

They stop at different times. A grant can end while a credential is still valid, and a
credential can expire while a connection sits open and usable. A database will happily
finish a query that was admitted before you revoked anything, and the result can arrive
after the revocation has already been reported as done.

That is why I stopped using the word revoked for this. In one small runtime I have been
building, the lifecycle has five separate observable events, and they are not
interchangeable:

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

The honest sentence is "admission closed and no sessions remain". A status line that says
revoked is hiding four questions behind one word, and at least one of them is usually
still true.

## Where each control stops

A secrets manager answers custody. It decides who may read which secret, and a
Vault-shaped issuer can even mint a short-lived database credential per task, which is
genuinely better than a long-lived password sitting in an environment variable.

What it does not answer is the effect. A lease tells you when a credential dies. It says
nothing about the query that was admitted a second earlier, and nothing about whether the
task will still get its answer. It also does not answer the case where the fix is to stop
using password authentication, because the expiry binding that makes short-lived
credentials work for PostgreSQL rides on password authentication. Change the auth path and
the clock you were relying on may no longer be the one enforcing anything.

A gateway answers admission. It sees a request, checks it against policy, and forwards or
refuses. The good ones check more than the hostname: the implementation I read validates
the HTTP method and path against a per-provider allowlist, so a permitted host does not
automatically mean a permitted operation.

The limit is structural. The gateway decides at the moment of admission, and the work
lands after it. Close the door and you have closed future admissions, which is exactly
what the phrase means and much less than it sounds like.

A sandbox answers reachability. The strongest arrangement I have read about gives the
agent container no network interface at all, drops every Linux capability, and mounts two
Unix sockets it may use for tool calls and model calls. Nothing else is reachable, and the
project aborts initialization when the connectivity check fails, so there is no quiet
fallback to a weaker network configuration.

That is a real boundary, and it is also where the subtleties live. If the fixture I want
the agent to reach resolves to loopback or to a private range, the same screen that keeps
the agent out of my network keeps it out of my own test stack, and the code says so
plainly: a fixture that resolves to loopback needs a specific option set before it is
reachable at all. This is the kind of thing you only learn by reading the source, and it
decides the shape of the whole design, because it means the adapter has to live somewhere the
declared route permits, and that location may be awkward.

## Two escape hatches worth knowing about

The same project documents one relaxation of that screen and ships a second one in code.

The documented one is an environment flag that makes the proxy treat any unknown host as a
passthrough tunnel. It is described as suitable for trusted environments only, and it
applies to all three host checks.

The second is an option named for tests, described in the source as a test-only escape
hatch for loopback fixtures. Nothing in user configuration reaches it. A lab that
constructs the proxy itself can set it, and if it does, the address screen is off, which
means any claim that the agent cannot reach an undeclared route stops being true in that
condition. The failure mode is quiet: the lab works better, the boundary disappears, and
the results look the same.

## A citation can lie in three ways

I have started treating every claim of the form "the code does this, at this file and
line" as unverified until I have fetched that source and grepped for the identifier. When
I did that for this project, three distinct problems turned up, and only one of them was
cosmetic.

A line number can move. That is stale and easy to fix.

An identifier can be gone or renamed. Then the mechanism the plan was built on does not
exist in the version you are about to pin, and you have a design problem.

The citation can never have existed. That is the expensive one, because it usually arrives
inside a document that is otherwise careful.

The related habit that has paid off more often is checking the enforcement site rather
than the declaration. A type or a function existing proves nothing about behaviour. In the
gateway I read, the endpoint filter is declared in one file and actually called in the
mitm proxy, on the request path, right before the credential swap. If I had stopped at the
declaration I would have written a sentence that was true and misleading.

```bash
# five mentions in the tree, and one place that decides anything
$ grep -rn "isEndpointAllowed" src --include="*.ts" | wc -l
5
$ grep -rn "isEndpointAllowed(provider.config" src --include="*.ts"
src/docker/mitm-proxy.ts:1105:    if (!isEndpointAllowed(provider.config, method, path)) {
```

Five hits, two of them comments, one an import. Exactly one of them runs on the request
path, which is the one that decides whether the filter means anything.

## How you would actually find out

Reading gets you a defensible hypothesis and a set of testable seams. It does not tell you
whether a stopped grant can still land an effect, and that is the question worth
answering, so the plan is a measurement first.

![Where the authority sits, and where a stop acts](/assets/img/authority-map.png)

*The roles, and the claim under test. A stop acts at the top of that flow, the effect lands at the service, the direct attempt from the sandbox is tested as a case, and the observer is a separate process that the task cannot see.*

The shape I settled on, which is deliberately small at first: one issuer, one service, one
observer. Freeze the expected outcome for each case before running anything, because an
expectation written afterwards is a description. Include a calibration case where a
permitted operation must succeed, so that later denials cannot be confused with a broken
lab. Separate the lifecycle events. One verdict hides the ordering. Observe from a
process that is not the one under test. Mark cases that cannot separate two events as
inconclusive, and do not merge them into a story. Record the negative controls, including
an actual attempt to reach the service directly, because inferring that from the topology
is not the same as observing it fail.

The gateway only earns its place in that sequence if the small version produces something
that needs it. Adding it first would mean spending the budget on plumbing and arriving at
the interesting question late.

## What is not established

Nothing here has been run. No component has been installed, no version is pinned, and
every third-party statement above is documentation and source reading at one revision,
which is a pointer, not evidence about the release I would actually use.

The single-implementation caveat matters too. One gateway having a particular endpoint
filter and a particular pair of escape hatches says nothing about the category, and one
realization of a lab says nothing general.

## What would make me stop

If the native controls close the gap cleanly once configured, the honest output is a
recipe and a negative result, not a new control. I have written that exit into the plan
along with the conditions that trigger it, because the alternative is a project that keeps
going to justify itself. The version of this I would be happy to publish either way is the
measurement: which clock actually stopped, what the observer saw, and what the lab could
not tell apart.

I am still exploring this, so treat the above as the current shape of the question and not
as a conclusion. The next step is deliberately unexciting: pin the versions, write down
what each case should show before running anything, and get one honest measurement out of
an issuer, a service and an observer. The gateway only joins the lab after that, and only
if the small version produces something that needs it.

If it turns out that the existing controls close the gap once they are configured
carefully, that is a result worth writing up, and I will write it up as one. Either way
the useful part is the measurement. More when I have it.
