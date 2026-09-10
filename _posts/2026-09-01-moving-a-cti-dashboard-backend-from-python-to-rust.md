---
layout: post
title: "moving a cti dashboard backend from python to rust"
date: 2026-09-01
author: bhanuharya
tags: [rust, python, performance, security, agents, cti, self-hosting]
redirect_from:
  - /blog/how-nyaabot-helped-validate-a-cti-rust-migration/
---

i moved the backend of my cti radar dashboard from python to rust a while back. frontend and data model untouched. this is the late writeup: what actually changed, what got faster, and what the numbers don't cover.

short version: authenticated dashboard reads got about twice as fast at half the memory, every security control survived the move, and the old python service is still running next to the rust one as a behavioral reference.

## what got rewritten

the service doing authenticated dashboard reads, state handling, enrichment orchestration, and report generation. that covers:

- dashboard and api routes with org scoped jobs and finding lifecycle state
- PII masking before read responses
- graph, summary, fleet, and finding views
- passive DNS, HTTP, TCP, TLS, banner, and InternetDB enrichment
- offline CVE matching and report generation
- optional AI assisted finding grading
- a fail closed wrapper for explicitly authorized active assessment tooling

the old python service stayed running as the reference. same routes, same responses, same errors. every rust slice was compared against it instead of assuming that matching function names meant matching behavior.

## where the implementation changed

```text
python reference                  rust implementation
----------------                  -------------------
FastAPI + python objects          axum + typed serde_json values
thread/subprocess style probes    tokio async HTTP, TCP, DNS, tls
serial cpu heavy transforms       rayon parallel normalization/masking
copy heavy state handling         borrowed/owned values, no deep copies
interpreter startup               compiled release binary
```

the workload has two very different profiles. remote enrichment is IO bound and benefits from async concurrency. local dashboard reads are cpu bound, load json state, mask, normalize, aggregate, build graph nodes. that's where i expected rust to actually matter.

## security invariants

i treated the security controls as migration invariants, not features to revisit later. each one had to land in the rust service with the same enforcement point as before:

- org slugs validated before filesystem use
- constant time api token comparison
- rate limited login attempts
- response security headers on
- atomic, permission restricted state writes
- provider urls checked against SSRF and DNS rebinding
- active assessment tooling stays fail closed and explicitly authorized

a rewrite that passes response tests but quietly loosens authorization is not an improvement, so any diff touching one of these paths got read before the slice was called done.

## the workflow

i used nyaa (my agent) as an implementation and review loop. each slice: pick one python behavior, write the rust equivalent, diff response shape and error behavior, re check the security sensitive paths, run a focused check, record what still differs. a mismatch was a compatibility bug to investigate, never a reason to edit the expected result until the test passed.

```text
inspect a python behavior
        |
implement one rust equivalent
        |
compare response shape and error behavior
        |
review security sensitive paths
        |
run a focused check
        |
record the remaining difference
```

the bot traced code paths, proposed implementations, and ran bounded checks. risk calls, benchmark data, and the release decision stayed with me.

## benchmark

i measured the part where the backend implementation should matter: authenticated, cpu heavy dashboard reads. same machine, same demo org data, same four paths (`/api/summary`, `/api/findings`, `/api/graph`, `/api/dashboard`), 16 concurrent clients, five 3 second runs per backend.

```text
metric                         python/fastapi       rust/axum
------                         --------------       ---------
throughput                     290.0 req/s          636.4 req/s
median latency (p50)           50.3 ms              18.7 ms
p95 latency                    101.9 ms             61.5 ms
p99 latency                    119.1 ms             81.7 ms
peak server rss under load     56.7 MB              27.5 MB
```

that is 2.19x the throughput, 62.8% lower median latency, 39.6% lower p95, and 51.5% lower peak rss. in plain terms: a little over twice as many requests at roughly half the memory, on the workload a dashboard actually runs.

## what this doesn't prove

it does not mean everything is 2.19x faster. a full passive scan is dominated by DNS response times, TCP/TLS handshake latency, remote rate limiting, and external data sources. rust trims local scheduling and subprocess overhead. it cannot make a remote endpoint answer faster. network heavy work gets a smaller, target dependent win.

the next measurement should be a controlled scan run: authorized targets, identical settings, wall clock time, cpu, rss, external request counts, and output equivalence. that is the number that matters for the scan path. requests per second was the right number for the api path.

## where it landed

the rust backend runs loopback bound on its own port with the same frontend and data layout. python is still available for comparison until the rust service has done a stretch of unattended runs.

net: the local read path is about twice as fast at half the memory, with the same controls in front of it. the review setup (reference implementation, written down invariants, small checkpoints, benchmarks matched to the workload) is what made the rewrite trustworthy. rust was just the tool.
