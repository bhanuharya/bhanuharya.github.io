---
layout: post
title: "I moved the CTI backend to Rust"
date: 2026-09-01
author: bhanuharya
tags: [rust, python, performance, security, agents, cti, self-hosting]
redirect_from:
  - /blog/how-nyaabot-helped-validate-a-cti-rust-migration/
description: >-
  Comparing each Rust route against the Python service it replaced, including error paths, before switching traffic.
---

I moved the CTI Radar backend from Python to Rust. The frontend and data model stayed put. I kept the old service running as a reference and compared each Rust route against it, including errors and security checks. This is the late write-up: the read-path benchmark improved; scan-path performance is still unmeasured.

## What got rewritten

The service doing authenticated dashboard reads, state handling, enrichment orchestration, and report generation. That covers:

- dashboard and API routes with org-scoped jobs and finding lifecycle state
- PII masking before read responses
- graph, summary, fleet, and finding views
- passive DNS, HTTP, TCP, TLS, banner, and InternetDB enrichment
- offline CVE matching and report generation
- optional AI-assisted finding grading
- a fail-closed wrapper for explicitly authorized active assessment tooling

The old Python service stayed running as the reference. Same routes, same responses, same errors. Every Rust slice was compared against it instead of assuming that matching function names meant matching behavior.

## Where the implementation changed

```text
Python reference                  Rust implementation
----------------                  -------------------
FastAPI + Python objects          axum + typed serde_json values
thread/subprocess style probes    tokio async HTTP, TCP, DNS, TLS
serial CPU-heavy transforms       rayon parallel normalization/masking
copy-heavy state handling         borrowed/owned values, no deep copies
interpreter startup               compiled release binary
```

The workload has two very different profiles. Remote enrichment is IO-bound and benefits from async concurrency. Local dashboard reads are CPU-bound: load JSON state, mask, normalize, aggregate, build graph nodes. That is where I expected Rust to actually matter.

## Security invariants

I treated the security controls as migration invariants, not features to revisit later. Each one had to land in the Rust service with the same enforcement point as before:

- org slugs validated before filesystem use
- constant-time API token comparison
- rate-limited login attempts
- response security headers on
- atomic, permission-restricted state writes
- provider URLs checked against SSRF and DNS rebinding
- active assessment tooling stays fail-closed and explicitly authorized

A rewrite that passes response tests but quietly loosens authorization is not an improvement, so any diff touching one of these paths got read before the slice was called done.

## The workflow

I used Nyaa (my agent) as an implementation and review loop. Each slice: pick one Python behavior, write the Rust equivalent, diff response shape and error behavior, re-check the security-sensitive paths, run a focused check, record what still differs. A mismatch was a compatibility bug to investigate, never a reason to edit the expected result until the test passed.

```text
inspect a Python behavior
        |
implement one Rust equivalent
        |
compare response shape and error behavior
        |
review security-sensitive paths
        |
run a focused check
        |
record the remaining difference
```

The bot traced code paths, proposed implementations, and ran bounded checks. Risk calls, benchmark data, and the release decision stayed with me.

## What I measured

The benchmark covers authenticated dashboard reads, not full scans. Same machine and demo data, four API paths, 16 concurrent clients, five 3-second runs per backend.

```text
metric                         Python/FastAPI       Rust/axum
------                         --------------       ---------
throughput                     290.0 req/s          636.4 req/s
median latency (p50)           50.3 ms              18.7 ms
p95 latency                    101.9 ms             61.5 ms
p99 latency                    119.1 ms             81.7 ms
peak server RSS under load     56.7 MB              27.5 MB
```

That is 2.19x the throughput, 62.8% lower median latency, 39.6% lower p95, and 51.5% lower peak RSS. In plain terms: a little over twice as many requests at roughly half the memory, on the workload a dashboard actually runs.

## What this doesn't prove

It does not mean everything is 2.19x faster. A full passive scan is dominated by DNS response times, TCP/TLS handshake latency, remote rate limiting, and external data sources. Rust trims local scheduling and subprocess overhead. It cannot make a remote endpoint answer faster. Network-heavy work gets a smaller, target-dependent win.

The next measurement should be a controlled scan run: authorized targets, identical settings, wall-clock time, CPU, RSS, external request counts, and output equivalence. That is the number that matters for the scan path. Requests per second was the right number for the API path.

The Rust service is running on loopback beside the Python reference. I am keeping both until it has more unattended run time.
