---
layout: post
title: "my scanner and SonarQube"
date: 2026-09-10
author: bhanuharya
tags: [security, devsecops, sonarqube, go, python, side-project]
---

I built a security scanner because SonarQube showed me a handful of hotspots in a codebase I cared about, and I wanted to know what else was there. A wider scan found 77 to 91 findings per service. That was not a fair comparison of the tools; they were looking for different things. I wanted a way to run the wider set and reconcile its output with what the team already reviewed.

## The first version was a platform

It was a web app first, not a CLI. FastAPI with SQLite, a dashboard, and seven scanners wired in parallel:

- bandit and opengrep for SAST
- trivy and osv-scanner for dependencies
- checkov for IaC, gitleaks for secrets, ZAP for DAST

Intake came from Bitbucket, or a ZIP, a local folder, or an approved DAST target. Findings kept an 8 KiB code context, and credential-shaped values were redacted before anything got stored. 35 Python files, about 6,000 lines.

The tool now runs the scanners locally, checks policy, and leaves artifacts even when a gate fails. The first version was a web app; I wanted one command in the repo and a non-zero exit code. So I rewrote it as a Go CLI ([ADR 0001](https://github.com/bhanuharya/secure-development-tools/blob/main/docs/adr/0001-implementation-language-go.md)) and left the Python version in the repo as reference.

## The rebuild

`sdt` is a Go CLI that wraps three existing scanners. OpenGrep for SAST, Gitleaks for secrets, Trivy for dependencies, all behind one command. Preflight check, scan, evaluate policy against agreed rules, generate a report (PDF/JSON/SARIF), and hand findings off to whichever tool the team reviews in. Boring on purpose. The scanning engines already exist. The missing piece was the connective tissue and the opinionated defaults.

What moved into Go:

- the run pipeline (context, plan, execute, normalize, policy, artifacts)
- engine execution as direct argv with no shell anywhere
- one canonical finding schema with occurrence-level fingerprints
- a typed YAML policy checked against a fingerprint baseline
- the same four artifacts on every run, including runs that fail the policy

Exit codes are the gate now, not a status field in a database. That came to 64 Go files and about 9,600 lines, so the rewrite is bigger than the thing it replaced. Dropping the server did not shrink the tool, it moved the weight into the parts that decide something.

The report plumbing stayed Python: PDF generation, the Sonar converter, the Dart analyzer converter, and the shared module they use. Go runs the scans, Python writes the paperwork.

What did not come across at all:

- the dashboard
- the database
- Bitbucket intake
- DAST orchestration

If I want ZAP pointed at a target again, I would be rebuilding that.

## The part that took longer than expected

The scanners were the easy part. The hard part was reconciliation, the unglamorous work of proving the numbers mean something.

I pointed `sdt` at three real Java microservices and imported everything into a local SonarQube lab. First result: 77 findings exported, zero visible. My gut said "the import failed." My gut was wrong. My rule naming did not match Sonar's `external_<engine>:<rule>` format, so the findings were there, just invisible to the filter I was using.

The Sonar import finally showed 249 of 255 findings. I had been staring at zero because I named the rules wrong. The other six were in dotfiles Sonar did not index. I also found three quieter gaps:

- dependency findings were excluded by narrow source scopes
- a tree-wide scan collided with `sonar.tests`
- imported issues appeared under Issues, not Security Hotspots

That loop, scanner says something, Sonar disagrees, then I find out why, took more time than writing the scanner. The tool was the easy part.

The scanner caught an assumption I had not checked: the published repository history still held identifiers the current tree no longer had. The cleanup was easy; deciding how to handle an already-public history was not. That is still open.

I also added scope checks, so a scan has to say whether it covered a snapshot or full history and whether dependency resolution completed. That caught a bug: two commands reported 24 and 137 rules for the same pack. I have not turned on blocking. For now, scans report findings and people review them. Leaked credentials are the first category I would consider blocking.
