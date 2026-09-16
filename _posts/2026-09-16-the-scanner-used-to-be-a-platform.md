---
layout: post
title: "The scanner used to be a platform"
date: 2026-09-16
author: bhanuharya
tags: [security, devsecops, go, python, side-project]
redirect_from:
  - /blog/getting-the-scanner-ready-for-other-people/
---

The first version of [secure-development-tools](https://github.com/bhanuharya/secure-development-tools) was a web platform. FastAPI, SQLite, a dashboard, seven scanners wired in parallel. Then I decided the shape was wrong and rebuilt the runtime in Go. The Python tree is still in the repo, untouched, as reference.

## What the first version was

It was a scan orchestration platform. You registered a project or ingested code, and it ran engines in parallel:

- SAST through bandit and opengrep, falling back to semgrep and then to a bundled local rule pack when offline
- dependencies through trivy and osv-scanner
- IaC through checkov and trivy's misconfig scanner
- secrets through gitleaks
- DAST through ZAP, against an approved target

Intake came from Bitbucket (workspace, repo, branch, optionally a pull-request diff so only changed lines got scanned) or from a ZIP, a local folder, or a DAST URL, through the dashboard or the CLI. Findings kept code context with an 8 KiB cap, and every credential-looking value was redacted before anything got stored. DAST targets needed an audited approval step before an active scan would run.

It worked. It was 35 Python files, about 6,000 lines.

## Why it got rebuilt instead of extended

The decision is written down as [ADR 0001](https://github.com/bhanuharya/secure-development-tools/blob/main/docs/adr/0001-implementation-language-go.md), dated 2026-09-04. The target was a local-first CLI plus a container image: immutable plans, canonical findings, deterministic policy, stable exit codes. Against that, a server, a database, a dashboard, and provider-coupled intake have no counterpart. The gap was architectural, not incremental, which is the part that took a while to accept.

Go won on four things: a single static binary with `CGO_ENABLED=0` for a multi-arch image, the scanner ecosystem already being Go (OpenGrep, Gitleaks, Trivy), orchestration being I/O-bound subprocess work where goroutines are enough, and a hiring pool if this ever becomes a team tool. The alternative was async Rust, which would also have meant git through a library instead of the `git` binary.

## What moved

- the runtime: context, plan, execute, normalize, policy, artifacts, under `cmd/sdt` and `internal/`
- engine execution as direct argv with no shell anywhere, byte-capped capture, redacted stderr
- one canonical finding schema, with occurrence-level fingerprints instead of file-level ones
- a typed YAML policy instead of Rego, evaluated against a fingerprint baseline
- the same four artifacts on every run, including runs that fail the policy
- exit codes as the actual gate

That is 64 Go files and about 9,600 lines, so the rewrite came out bigger than the thing it replaced. Dropping the server and the dashboard did not shrink the tool, it moved the weight into the parts that decide something.

## What stayed Python

The report plumbing: PDF generation, the Sonar converter, the Dart analyzer converter, and the shared knowledge module they all use. Go runs the scans, Python writes the paperwork, and CI py_compiles those helpers so they cannot rot quietly.

And `src/` stays as the reference tree. It is not hardened, its tests pass locally but are not wired into CI, and it is now where most of the first-party SAST findings in a full self-scan come from.

## What got dropped

The dashboard, the database, Bitbucket intake, and DAST orchestration. If I want to point ZAP at a target again, that is not in the new runtime and I would be rebuilding it. Nothing talks to a server now, which is the trade I wanted: the verdict shows up where the code is, not in a tab I have to remember to open.

## Where it is

0.1.0-dev. Pre-release, schemas not frozen, not in a live pipeline yet. CI is green (Go gate, rule bundle verification, offline tool checks, and an engine smoke test against the vulnerable fixture), and a full self-scan of the repo still exits 1 on purpose, because the tree carries fixtures that exist to be found.
