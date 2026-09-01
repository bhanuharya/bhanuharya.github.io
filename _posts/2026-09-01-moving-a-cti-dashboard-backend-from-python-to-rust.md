---
layout: post
title: "Rebuilding a CTI Radar Backend with Rust and NyaaBot"
date: 2026-09-01
author: bhanuharya
tags: [rust, python, performance, security, agents, cti, self-hosting]
redirect_from:
  - /blog/how-nyaabot-helped-validate-a-cti-rust-migration/
---

A backend rewrite is easy to describe as a language change. The difficult part is proving that the new implementation still behaves like the old one, keeps the same security boundaries, and improves the workload that motivated the migration.

For a small self-hosted CTI Radar dashboard, I moved the backend from Python/FastAPI to Rust/Axum. NyaaBot helped make the migration reviewable: the Python service stayed as the behavioral reference while the Rust service was implemented in bounded steps, checked against the existing contract, and measured under the same local dashboard workload.

The result was not a claim that Rust makes every security scan faster. It was a narrower and more useful outcome: the local API path became substantially faster and lighter without relaxing the controls around the security data it serves.

## The migration boundary

The frontend and data model stayed in place. The rewrite covered the service responsible for authenticated dashboard reads, state handling, enrichment orchestration, and report generation.

The original Python backend remained the reference for observable behavior:

- authenticated dashboard and API routes;
- organization-scoped jobs and finding lifecycle state;
- PII masking before read responses;
- graph, summary, fleet, and finding views;
- passive DNS, HTTP, TCP, TLS, banner, and InternetDB enrichment;
- offline CVE matching and report generation;
- optional AI-assisted finding grading; and
- a fail-closed wrapper for explicitly authorized active-assessment tooling.

The implementation changed where Rust offered a practical advantage:

```text
Python reference                  Rust implementation
----------------                  -------------------
FastAPI + Python objects          Axum + typed serde_json values
thread/subprocess-style probes    Tokio async HTTP, TCP, DNS, and TLS work
serial CPU-heavy transformations  Rayon data-parallel normalization/masking
copy-heavy state handling         borrowed/owned values without deep copies
interpreter startup               compiled release binary
```

The objective was to improve the local service, not to turn a remote network into a faster one.

## How NyaaBot helped

NyaaBot was used as a structured implementation and review loop rather than as an unrestricted rewrite command.

### Establishing the behavioral reference

The first useful output was not Rust code. It was a list of responsibilities that could not silently disappear during the migration. Describing the contract in terms of routes, data transformations, authorization, and failure behavior made it possible to compare implementations without assuming that matching function names meant matching behavior.

Each migration slice had a concrete acceptance target: a route, a transformation, a compatibility decision, or a validation result. That made it possible to stop after any step and inspect the diff.

### Separating I/O from CPU work

The backend has two very different performance profiles:

```text
remote enrichment       → asynchronous I/O and bounded concurrency
local dashboard reads   → parsing, masking, normalization, aggregation
```

Tokio fit the asynchronous service and network operations. Rayon fit independent CPU-heavy transformations such as masking, normalization, and graph preparation. This division also kept the performance hypothesis testable: the strongest expected improvement was in authenticated dashboard reads, not in DNS response time or a remote HTTP server.

### Treating security controls as invariants

The migration review asked where each security property was enforced in the new implementation:

- organization slugs are validated before filesystem use;
- API-token comparison is constant-time;
- login attempts are rate-limited;
- response security headers remain enabled;
- state writes remain atomic and permission-restricted;
- provider URLs are checked against SSRF and DNS-rebinding risks; and
- active-assessment operations remain fail-closed and explicitly authorized.

This was an important constraint on the agent workflow. A rewrite that passes response tests but weakens authorization or URL validation is not an improvement.

## The checkpoint loop

The practical workflow was deliberately repetitive:

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

A mismatch in a response field or status code was treated as a compatibility issue to investigate, not as permission to update the expected result until it passed. That kept the reference implementation useful throughout the rewrite.

The bot could trace a code path, propose an implementation, run a bounded check, and identify a difference. Decisions about acceptable risk, authorized benchmark data, and release readiness remained human responsibilities.

## Benchmark method

I measured the part of the application where backend implementation should matter: authenticated, CPU-heavy dashboard reads.

Both services used the same machine, the same demo organization data, and the same four request paths:

```text
/api/summary
/api/findings
/api/graph
/api/dashboard
```

The load was 16 concurrent clients. Each backend completed five three-second runs. The reported values are the benchmark harness output for that run, not a synthetic projection.

## Results

```text
Metric                         Python/FastAPI       Rust/Axum
------                         --------------       ---------
Throughput                     290.0 req/s          636.4 req/s
Median latency (p50)           50.3 ms              18.7 ms
p95 latency                    101.9 ms             61.5 ms
p99 latency                    119.1 ms             81.7 ms
Peak server RSS under load     56.7 MB              27.5 MB
```

Expressed as relative changes, the Rust backend delivered:

- **2.19× higher throughput**: 636.4 versus 290.0 requests per second;
- **62.8% lower median latency**: 18.7 ms versus 50.3 ms;
- **39.6% lower p95 latency** and **31.4% lower p99 latency**;
- **51.5% lower peak resident memory**: 27.5 MB versus 56.7 MB.

For the dashboard/read workload, the service handled a little more than twice as many requests while using roughly half as much memory.

## Why the local read path benefits

The dashboard endpoints perform several small transformations on every request: load JSON state, remove sensitive values, normalize findings, aggregate counts, and build graph nodes and edges. That work is cheap once, but it compounds when several users or automation clients request it concurrently.

Rust helps here in three practical ways.

### Async serving without interpreter overhead

Tokio keeps many in-flight operations in a single asynchronous runtime. The service spends less time coordinating threads and more time doing response work.

### Parallel CPU work where it is safe

Masking, normalization, and graph preparation are independent over many findings. Rayon distributes those transformations across available CPU cores without sharing mutable request state.

### Lower memory pressure

The Rust service avoids per-request Python object overhead and unnecessary deep copies in the correlation path. Lower RSS preserves headroom for the browser, report rendering, scheduled jobs, and other local tools on a small self-hosted host.

## What the benchmark does not prove

A dashboard API benchmark is not a claim that every operation is 2.19× faster.

A full passive scan is dominated by remote conditions: DNS response time, TCP connection latency, TLS negotiation, rate limiting, and external data-source availability. Rust can reduce local scheduling and subprocess overhead, but it cannot make a remote endpoint respond faster.

The useful interpretation is narrower:

```text
local transformation and API work  → strong Rust advantage
remote network reconnaissance      → smaller, target-dependent advantage
```

That distinction keeps a benchmark connected to the workload it actually measured instead of turning one local result into a universal performance claim.

## Operational outcome

The Rust backend runs as a loopback-bound service on its own port while preserving the existing frontend and data layout. Keeping the Python reference available during migration made it possible to compare behavior instead of treating the rewrite as an irreversible replacement.

The next comparison should use a controlled set of authorized targets and identical scan settings. It should capture wall-clock time, CPU, peak RSS, external request counts, and output equivalence. For network-heavy work, those details are more informative than a single requests-per-second number.

The broader lesson is about agent-assisted engineering as much as Rust. NyaaBot did not replace judgment; it reduced the cost of applying judgment repeatedly. A reference implementation, explicit security invariants, small checkpoints, and workload-matched measurements produced a migration that was both faster on the local API path and easier to evaluate honestly.
