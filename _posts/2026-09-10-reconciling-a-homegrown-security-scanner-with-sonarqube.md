---
layout: post
title: "my scanner and SonarQube"
date: 2026-09-10
author: bhanuharya
tags: [security, devsecops, sonarqube, go, python, side-project]
---

Every security team eventually hits the same wall: the standard tools give answers, but not *your* answers. That happened to me, and the solution was, characteristically, to spend my free time building another tool. This is the story of that.

## The itch

At work we run SonarQube and the usual pipeline stuff. It is fine. But when I looked at a codebase I cared about, Sonar would show me a handful of hotspots and I would think: is that... it? The answer turned out to be no. Not because Sonar is bad, but because its security rules cover a narrow slice. When I ran a wider net (pattern-based SAST over 140+ rules, a secrets scanner, and a dependency checker) over the same code, the counts jumped from "a few" to 77-91 findings per service, depending on the codebase.

Both numbers are true at once. They just measure different things. I wanted the wider net, and I wanted it running automatically, with a policy gate, producing something a human could actually review instead of a raw export nobody opens.

## The first version was a platform

It was a web app first, not a CLI. FastAPI with SQLite, a dashboard, and seven scanners wired in parallel: bandit and opengrep for SAST, trivy and osv-scanner for dependencies, checkov for IaC, gitleaks for secrets, ZAP for DAST. Intake came from Bitbucket, or a ZIP, a local folder, or an approved DAST target. Findings kept an 8 KiB code context, and credential-shaped values were redacted before anything got stored. 35 Python files, about 6,000 lines.

The engines worked. The shape was wrong. A verdict that lives in a dashboard only helps if somebody opens the dashboard, and what I actually wanted was a gate: one line of output, a non-zero exit, evidence left behind, running wherever the code already is. A server, a database, a dashboard, and provider-coupled intake have no counterpart in that design, so the gap was architectural rather than incremental. I wrote it down as [ADR 0001](https://github.com/bhanuharya/secure-development-tools/blob/main/docs/adr/0001-implementation-language-go.md), dated 2026-09-04, and rebuilt the runtime in Go. The Python tree is still in the repo, untouched, as reference.

## The rebuild

`sdt` is a Go CLI that wraps three existing scanners. OpenGrep for SAST, Gitleaks for secrets, Trivy for dependencies, all behind one command. Preflight check, scan, evaluate policy against agreed rules, generate a report (PDF/JSON/SARIF), and hand findings off to whichever tool the team reviews in. Boring on purpose. The scanning engines already exist. The missing piece was the connective tissue and the opinionated defaults.

What moved into Go: the run pipeline (context, plan, execute, normalize, policy, artifacts), engine execution as direct argv with no shell anywhere, one canonical finding schema with occurrence-level fingerprints, a typed YAML policy checked against a fingerprint baseline, and the same four artifacts on every run, including runs that fail the policy. Exit codes are the gate now, not a status field in a database. That came to 64 Go files and about 9,600 lines, so the rewrite is bigger than the thing it replaced. Dropping the server did not shrink the tool, it moved the weight into the parts that decide something.

The report plumbing stayed Python: PDF generation, the Sonar converter, the Dart analyzer converter, and the shared module they use. Go runs the scans, Python writes the paperwork. What did not come across at all: the dashboard, the database, Bitbucket intake, and DAST orchestration. If I want ZAP pointed at a target again, I would be rebuilding that.

## The part that took longer than expected

The scanners were the easy part. The hard part was reconciliation, the unglamorous work of proving the numbers mean something.

I pointed `sdt` at three real Java microservices and imported everything into a local SonarQube lab. First result: 77 findings exported, zero visible. My gut said "the import failed." My gut was wrong. My rule naming did not match Sonar's `external_<engine>:<rule>` format, so the findings were there, just invisible to the filter I was using.

Once the naming clicked, the reconciliation went from "gap = 77" to "gap = 6 out of 255". That is 97.6% of findings showing up in Sonar's Issues tab. The remaining six come from one systematic cause: dotfiles that Sonar's scanner never indexes, so any finding inside `.npmrc` or `.yo-rc.json` has nowhere to land.

I also learned the hard way that Sonar pipes several findings into a black hole quietly. Narrow source scopes make dependency findings vanish (they live on `pom.xml`, not in `src/`). Tree-wide scans then collide with the app's own `sonar.tests` setting. And imported issues land in Issues, never in the Security Hotspots view your team actually reviews. Three different ways a scan can "pass" while half its output quietly never gets displayed.

That loop, scanner says something, Sonar disagrees, find out why, is most of what I actually did. The tool is a byproduct.

## What I built without meaning to

Two things fell out of the pilot that I did not plan.

**A governance engine.** Forcing every scan to declare its scope: was this a snapshot commit or full history? Are dependencies fully resolved, or did offline mode silently skip some? It turns vague claims ("we scanned it") into checkable assertions. A green dashboard that hides a failed dependency resolution is a lie. A green dashboard that shows "partial coverage" is honest.

**A history audit.** I git-audited the published repo expecting a clean pass. I got a partial pass. The sanitize commit I did earlier had cleaned the current tree, but earlier commits, already merged, already public, still contained internal identifiers. Fixing it is not a technical problem, it is a process problem (a force push breaks everyone's clone), and the honest status is "open decision".

That last one is the part I keep thinking about. I built a scanner to catch vulnerabilities in code, and it is most useful as a tool for catching my own assumptions: that the pipeline works, that the numbers are not inflated, that the history I published is actually clean. All false at one point or another during this :-)

## Where it is going

Right now: advisory mode everywhere, nothing blocked, humans review everything. Next: PR-level feedback, then strict enforcement for the most unambiguous category, leaked credentials, and nowhere else. At least for a while.

The takeaway if you are considering something similar: do not build a scanner. Build a *reconciliation* layer that tells you every time your scanner and your review tools disagree, and fix the disagreements one by one. Most of "security tooling" is that loop, made repetitive.

And accept that you will spend a nontrivial fraction of the project fighting your own bugs. The scanner had a bug where two internal commands reported different rule counts for the same rule pack, 24 vs 137, because they used different discovery logic. Two tools, one opinion, both mine. That is the real work: making your own tool stop lying to you.
