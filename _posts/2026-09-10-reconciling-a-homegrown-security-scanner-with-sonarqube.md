---
layout: post
title: "Why I Built My Own Security Scanner (and Then Had to Explain It to SonarQube)"
date: 2026-09-10
author: bhanuharya
tags: [security, devsecops, sonarqube, side-project]
---

Every security team eventually hits the same wall: the standard tools give answers, but not *your* answers. That happened to me, and the solution was, characteristically, to spend my free time building another tool. This is the story of that.

## The itch

At work we run SonarQube and the usual pipeline stuff. It is fine. But when I looked at a codebase I cared about, Sonar would show me a handful of hotspots and I would think: is that... it? The answer turned out to be no. Not because Sonar is bad, but because its security rules cover a narrow slice. When I ran a wider net (pattern-based SAST over 140+ rules, a secrets scanner, and a dependency checker) over the same code, the counts jumped from "a few" to 77-91 findings per service, depending on the codebase.

Both numbers are true at once. They just measure different things. I wanted the wider net, and I wanted it running automatically, with a policy gate, producing something a human could actually review instead of a raw export nobody opens.

So I built `sdt`: a Go CLI that wraps three existing scanners. OpenGrep for SAST, Gitleaks for secrets, Trivy for dependencies, all behind one command. Preflight check, scan, evaluate policy against agreed rules, generate a report (PDF/JSON/SARIF), and hand findings off to whichever tool the team reviews in. Boring on purpose. The scanning engines already exist. The missing piece was the connective tissue and the opinionated defaults.

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
