---
layout: post
title: "How NyaaBot Helped Validate a CTI Radar Rust Migration"
date: 2026-09-01
author: bhanuharya
tags: [agents, rust, python, security, cti, engineering]
---

A backend rewrite is easy to describe as a language change. The difficult part is proving that the new implementation still behaves like the old one, keeps the same boundaries, and improves the workload that motivated the migration.

For the CTI Radar dashboard, NyaaBot helped turn that rewrite into a sequence of bounded engineering tasks. The Python/FastAPI service remained the behavioral reference while the new Rust/Axum service was built, inspected, and measured alongside it.

The bot did not make the migration autonomous. It made the migration easier to inspect.

## The assignment was narrower than “rewrite it in Rust”

The useful task definition had four parts:

1. preserve the existing dashboard and data model;
2. keep security controls intact;
3. improve local API and transformation work; and
4. measure the result against the Python reference.

That framing prevented the project from becoming a general rewrite. Network reconnaissance was deliberately treated as a separate concern because its runtime is dominated by remote systems rather than the local web framework.

The working boundary looked like this:

```text
                 same data and API contract
                            │
             ┌──────────────┴──────────────┐
             │                             │
     Python/FastAPI reference       Rust/Axum implementation
             │                             │
             └──────────────┬──────────────┘
                            │
                  equivalent responses
                            │
                    controlled benchmark
```

## What NyaaBot contributed

NyaaBot was most useful as a structured implementation and review loop. It handled small, verifiable slices instead of treating the repository as one large prompt.

### 1. It established the behavioral reference

Before changing implementation details, the bot identified the responsibilities that could not silently disappear:

- authenticated dashboard and API routes;
- organization-scoped state and jobs;
- PII masking before responses;
- graph and summary generation;
- enrichment and offline CVE matching;
- report generation; and
- explicit authorization gates around active-assessment tooling.

This list was more valuable than a list of Python modules. It described the observable contract and the security boundary that the new service had to preserve.

### 2. It separated I/O work from CPU work

The migration plan treated the backend as two workloads rather than one:

```text
remote enrichment       → asynchronous I/O and bounded concurrency
local dashboard reads   → parsing, masking, normalization, aggregation
```

That separation led to a practical Rust design: Tokio for asynchronous service and network operations, with Rayon for independent CPU-heavy transformations. It also kept the performance claim honest. The strongest expected improvement was in authenticated dashboard reads, not in the speed of DNS or a remote HTTP server.

### 3. It reviewed safeguards as migration invariants

The bot checked the new implementation against the controls that mattered most:

- organization slugs are validated before filesystem use;
- API-token comparison is constant-time;
- login attempts are rate-limited;
- response security headers remain enabled;
- state writes remain atomic and permission-restricted;
- provider URLs are checked against SSRF and DNS-rebinding risks; and
- active-assessment operations remain fail-closed and explicitly authorized.

These checks changed the review question from “does the Rust code compile?” to “what security property did the Python service have, and where is it enforced now?”

## The bot worked in checkpoints

Each step had a concrete output: a route, a transformation, a compatibility decision, or a validation result. That made it possible to stop after any step and inspect the diff.

A typical loop was:

```text
inspect a Python behavior
        │
implement one Rust equivalent
        │
compare response shape and error behavior
        │
review security-sensitive paths
        │
run a focused check
        │
record the remaining difference
```

This approach also made failures useful. A mismatch in a response field or status code was treated as a compatibility issue to investigate, not as permission to update the test until it passed.

## Measurement was part of the implementation

NyaaBot helped keep the benchmark tied to the reason for the rewrite. The comparison used the same machine, demo organization data, request paths, concurrency, and run duration for both services.

The measured endpoints represented authenticated dashboard work: summary, findings, graph, and dashboard reads. The benchmark then compared throughput, latency percentiles, and peak memory rather than relying on startup time or a single hand-picked request.

The result was a substantial improvement for that workload: more than twice the throughput, lower p50/p95/p99 latency, and approximately half the peak resident memory. The full figures and methodology are documented separately in [the CTI Radar backend migration report]({{ '/blog/moving-a-cti-dashboard-backend-from-python-to-rust/' | relative_url }}).

Keeping the numbers in a separate performance article made the role of the bot clearer. This article is about the engineering process that made those numbers credible; the companion article is about the measurements themselves.

## What the bot did not decide

Several decisions remained human responsibilities:

- whether the performance target justified a rewrite;
- which security controls were mandatory;
- whether a compatibility difference was acceptable;
- which authorized data could be used for benchmarking; and
- whether the Rust service was ready to replace the reference implementation.

The bot could identify a mismatch, trace a code path, propose an implementation, and run a bounded check. It could not define the project’s risk tolerance or turn a local benchmark into a universal performance claim.

That distinction matters particularly for security software. An agent that optimizes only for a green test suite can accidentally remove friction that was serving as a control. The migration stayed safer because the acceptance criteria included security behavior and operational boundaries, not just speed.

## Why this workflow worked

The migration benefited from three constraints.

First, the old service stayed available as a reference. There was no need to guess what an endpoint should do from a type definition alone.

Second, the agent was given narrow tasks with explicit evidence requirements. “Implement the graph read path and compare its response shape” is easier to review than “finish the Rust rewrite.”

Third, performance was measured only after correctness and security checks had a stable baseline. This avoided optimizing a behavior that later had to be rewritten because it was incomplete or unsafe.

The resulting workflow is reusable beyond this project:

```text
behavioral reference
        +
security invariants
        +
small implementation checkpoints
        +
controlled measurement
        =
reviewable agent-assisted migration
```

## The practical lesson

NyaaBot did not replace engineering judgment. It reduced the cost of applying that judgment repeatedly: inspect the old behavior, make one change, compare the result, and preserve evidence for the next review.

That is a better role for an engineering agent than pretending a rewrite can be delegated as one undifferentiated task. The agent can accelerate the loop, but the loop still needs a reference implementation, explicit security constraints, and measurements that match the workload.

For CTI Radar, that discipline produced a Rust backend that was both lighter on the local host and easier to evaluate without discarding the behavior and controls that made the original service useful.
