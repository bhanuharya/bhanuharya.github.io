---
layout: post
title: "Moving a CTI dashboard backend from Python to Rust"
date: 2026-09-01
author: bhanuharya
tags: [rust, python, performance, security, agents, cti, self-hosting]
redirect_from:
  - /blog/how-nyaabot-helped-validate-a-cti-rust-migration/
---

I moved the backend of my CTI radar dashboard from Python/FastAPI to Rust/Axum. The frontend and data model didn't change. This post is the honest version of that migration: what stayed the same, what got faster, and what the numbers don't cover.

The short version: authenticated dashboard reads got about twice as fast at half the memory, every security control survived the move, and the old Python service is still running next to the Rust one as a behavioral reference.

## What got rewritten

The service doing authenticated dashboard reads, state handling, enrichment orchestration, and report generation. That covers:

- dashboard and API routes with org-scoped jobs and finding lifecycle state
- PII masking before read responses
- graph, summary, fleet, and finding views
- passive DNS, HTTP, TCP, TLS, banner, and InternetDB enrichment
- offline CVE matching and report generation
- optional AI-assisted finding grading
- a fail-closed wrapper for explicitly authorized active-assessment tooling

The old Python service stayed running as the reference implementation. Same routes, same responses, same errors. Every Rust slice was compared against it instead of assuming that matching function names meant matching behavior.

## Where the implementation changed

```text
Python reference                  Rust implementation
----------------                  -------------------
FastAPI + Python objects          Axum + typed serde_json values
thread/subprocess-style probes    Tokio async HTTP, TCP, DNS, and TLS work
serial CPU-heavy transformations  Rayon data-parallel normalization/masking
copy-heavy state handling         borrowed/owned values without deep copies
interpreter startup               compiled release binary
```

The workload has two very different profiles. Remote enrichment is I/O-bound and benefits from async concurrency. Local dashboard reads are CPU-bound — load JSON state, mask, normalize, aggregate, build graph nodes — and that is where I expected Rust to actually matter.

## Security invariants

I treated the security controls as migration invariants, not features to revisit later. Each one had to land in the Rust service with the same enforcement point as before:

- org slugs validated before filesystem use
- constant-time API token comparison
- rate-limited login attempts
- response security headers on
- atomic, permission-restricted state writes
- provider URLs checked against SSRF and DNS rebinding
- active-assessment tooling stays fail-closed and explicitly authorized

A rewrite that passes response tests but quietly loosens authorization is not an improvement, so any diff touching one of these paths got read before the slice was called done.

## The workflow

I used NyaaBot as an implementation and review loop. Each slice: pick one Python behavior, write the Rust equivalent, diff response shape and error behavior, re-check the security-sensitive paths, run a focused check, record what still differs. A mismatch was a compatibility bug to investigate, never a reason to edit the expected result until the test passed.

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

The bot traced code paths, proposed implementations, and ran bounded checks. Risk calls, benchmark data, and the release decision stayed with me.

## Benchmark

I measured the part where the backend implementation should matter: authenticated, CPU-heavy dashboard reads. Same machine, same demo org data, same four paths (`/api/summary`, `/api/findings`, `/api/graph`, `/api/dashboard`), 16 concurrent clients, five 3-second runs per backend.

```text
Metric                         Python/FastAPI       Rust/Axum
------                         --------------       ---------
Throughput                     290.0 req/s          636.4 req/s
Median latency (p50)           50.3 ms              18.7 ms
p95 latency                    101.9 ms             61.5 ms
p99 latency                    119.1 ms             81.7 ms
Peak server RSS under load     56.7 MB              27.5 MB
```

That is 2.19× the throughput, 62.8% lower median latency, 39.6% lower p95, and 51.5% lower peak RSS. In plain terms: a little over twice as many requests at roughly half the memory, on the workload a dashboard actually runs.

## What this doesn't prove

It does not mean everything is 2.19× faster. A full passive scan is dominated by DNS response times, TCP/TLS handshake latency, remote rate limiting, and external data sources. Rust trims local scheduling and subprocess overhead; it cannot make a remote endpoint answer faster. Network-heavy work gets a smaller, target-dependent win.

The next measurement should be a controlled scan run: authorized targets, identical settings, wall-clock time, CPU, RSS, external request counts, and output equivalence. That is the number that matters for the scan path; requests-per-second was the right number for the API path.

## Where it landed

The Rust backend runs loopback-bound on its own port with the same frontend and data layout. Python is still available for comparison until the Rust service has done a stretch of unattended runs.

Net: the local read path is about twice as fast at half the memory, with the same controls in front of it. The review setup — reference implementation, written-down invariants, small checkpoints, benchmarks matched to the workload — is what made the rewrite trustworthy. Rust was just the tool.
