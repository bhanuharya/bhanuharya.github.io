---
layout: post
title: "Moving a CTI Dashboard Backend from Python to Rust"
date: 2026-09-01
author: bhanuharya
tags: [rust, python, performance, security, self-hosting, cti]
---

A CTI dashboard has two very different performance profiles.

The scan path spends much of its time waiting on DNS, TCP, TLS, and HTTP. The dashboard path does not. It repeatedly reads findings, masks sensitive values, normalizes records, builds graph data, and renders summaries for authenticated users.

I rewrote the backend of a small self-hosted CTI Radar dashboard from FastAPI/Python to Rust. The frontend and data model stayed in place; the new backend is an Axum service using Tokio for I/O and Rayon for CPU-bound transformations.

The goal was not to turn a network-bound scan into magic. It was to make the local API path lighter, more concurrent, and easier to run on a small host without weakening the security controls that matter for a security dashboard.

## What changed

The original Python backend remains the behavioral reference. The Rust implementation keeps the same broad responsibilities:

- authenticated dashboard and API routes;
- per-organization jobs and finding lifecycle state;
- PII masking before read responses;
- graph, summary, fleet, and finding views;
- passive DNS, HTTP, TCP, TLS, banner, and InternetDB enrichment;
- offline CVE matching and report generation;
- optional AI-assisted finding grading; and
- a fail-closed wrapper for explicitly authorized active-assessment tooling.

The implementation strategy changed where Rust has a useful advantage:

```text
Python reference                  Rust implementation
----------------                  -------------------
FastAPI + Python objects          Axum + typed serde_json values
thread/subprocess-style probes    Tokio async HTTP, TCP, DNS, and TLS work
serial CPU-heavy transformations  Rayon data-parallel normalization/masking
copy-heavy state handling         borrowed/owned values without deep copies
interpreter startup               compiled release binary
```

The rewrite is not an excuse to remove safeguards. The Rust service still validates organization slugs before filesystem use, uses constant-time comparison for API tokens, limits login attempts, applies response security headers, writes state atomically with restricted permissions, and validates AI-provider URLs against SSRF and DNS-rebinding risks.

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

For the dashboard/read workload, that is a meaningful result. The service handles a little more than twice as many requests while using roughly half as much memory.

## Why the read path benefits

The dashboard endpoints perform several small transformations on every request: load JSON state, remove sensitive values, normalize findings, aggregate counts, and build graph nodes and edges. That work is cheap once, but it compounds when several users or automation clients request it concurrently.

Rust helps here in three practical ways.

### Async serving without Python interpreter overhead

Tokio keeps many in-flight operations in a single asynchronous runtime. For read endpoints, the service can spend less time coordinating threads and more time doing the actual response work.

### Parallel CPU work where it is safe

Masking, normalization, and graph preparation are independent over many findings. Rayon can distribute those transformations across available CPU cores without sharing mutable request state.

### Smaller memory footprint

The Rust service avoids per-request Python object overhead and avoids defensive deep copies in the correlation path. Lower RSS is useful on a self-hosted system because it preserves headroom for the browser, report rendering, scheduled jobs, and other local tools.

## What this benchmark does *not* prove

A dashboard API benchmark is not a claim that every operation is 2.19× faster.

A full passive scan is dominated by remote conditions: DNS response time, TCP connection latency, TLS negotiation, rate limiting, and the availability of external data sources. Rust can reduce local scheduling and subprocess overhead there, but it cannot make a remote endpoint respond faster.

The useful interpretation is narrower:

```text
local transformation and API work  → strong Rust advantage
remote network reconnaissance      → smaller, target-dependent advantage
```

That distinction matters. It keeps a benchmark from becoming a marketing number detached from the workload it actually measured.

## Operational outcome

The Rust backend now runs as a loopback-bound service on its own port while preserving the existing frontend and data layout. That makes it possible to compare the Python reference and Rust implementation during migration rather than treating the rewrite as an irreversible replacement.

The next comparison should use a controlled set of authorized targets and identical scan settings. It should capture wall-clock time, CPU, peak RSS, external request counts, and output equivalence. For network-heavy work, those details are more important than a single requests-per-second number.

The main result is already useful: the dashboard becomes more responsive and substantially lighter without expanding its network exposure or relaxing its security model.
