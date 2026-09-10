---
layout: post
title: "why i built my own security scanner (and then had to explain it to sonar)"
date: 2026-09-10
author: bhanuharya
tags: [security, devsecops, sonarqube, side-project]
---

every security team eventually hits the same wall: the standard tools give answers, but not *your* answers. that happened to me and the solution was, characteristically, to spend my free time building another tool. this is the story of that.

## the itch

at work we run sonarqube and the usual pipeline stuff. it's fine. but when i'd look at a codebase i cared about, sonar would show me a handful of hotspots and i'd think: is that... it? the answer turned out to be no. not because sonar is bad, but because its security rules cover a narrow slice. when i ran a wider net (pattern based SAST over 140+ rules, a secrets scanner, and a dependency checker) over the same code, the counts jumped from "a few" to 77-91 findings per service depending on the codebase.

both numbers are true at once. they just measure different things. i wanted the wider net, and i wanted it running automatically, with a policy gate, producing something a human could actually review instead of a raw export nobody opens.

so i built `sdt`: a go CLI that wraps three existing scanners. opengrep for SAST, gitleaks for secrets, trivy for dependencies, all behind one command. preflight check, scan, evaluate policy against agreed rules, generate a report (pdf/json/sarif), and hand findings off to whichever tool the team reviews in. boring on purpose. the scanning engines already exist. the missing piece was the connective tissue and the opinionated defaults.

## the part that took longer than expected

the scanners were the easy part. the hard part was reconciliation, the unglamorous work of proving the numbers mean something.

i pointed `sdt` at three real java microservices and imported everything into a local sonarqube lab. first result: 77 findings exported, zero visible. my gut said "the import failed." my gut was wrong. my rule naming didn't match sonar's `external_<engine>:<rule>` format, so the findings were there, just invisible to the filter i was using.

once the naming clicked, the reconciliation went from "gap = 77" to "gap = 6 out of 255". that's 97.6% of findings showing up in sonar's Issues tab. the remaining six come from one systematic cause: dotfiles that sonar's scanner never indexes, so any finding inside `.npmrc` or `.yo-rc.json` has nowhere to land.

i also learned the hard way that sonar pipes several findings into a black hole quietly. narrow source scopes make dependency findings vanish (they live on `pom.xml`, not in `src/`). tree wide scans then collide with the app's own `sonar.tests` setting. and imported issues land in Issues, never in the Security Hotspots view your team actually reviews. three different ways a scan can "pass" while half its output quietly never gets displayed.

that loop, scanner says something, sonar disagrees, find out why, is most of what i actually did. the tool is a byproduct.

## what i built without meaning to

two things fell out of the pilot that i didn't plan:

**a governance engine.** forcing every scan to declare its scope, was this a snapshot commit or full history? are dependencies fully resolved or did offline mode silently skip some? turns vague claims ("we scanned it") into checkable assertions. a green dashboard that hides a failed dependency resolution is a lie. a green dashboard that shows "partial coverage" is honest.

**a history audit.** i git audited the published repo expecting a clean pass. i got a partial pass. the sanitize commit i did earlier had cleaned the current tree, but earlier commits, already merged, already public, still contained internal identifiers. fixing it isn't a technical problem, it's a process problem (force push breaks everyone's clone), and the honest status is "open decision".

that last one is the part i keep thinking about. i built a scanner to catch vulnerabilities in code and it's most useful as a tool for catching my own assumptions: that the pipeline works, that the numbers aren't inflated, that the history i published is actually clean. all false at one point or another during this :-)

## where it's going

right now: advisory mode everywhere, nothing blocked, humans review everything. next: PR level feedback, then strict enforcement for the most unambiguous category, leaked credentials, and nowhere else. at least for a while.

the takeaway if you're considering something similar: don't build a scanner. build a *reconciliation* layer that tells you every time your scanner and your review tools disagree, and fix the disagreements one by one. most of "security tooling" is that loop, made repetitive.

and accept that you'll spend a nontrivial fraction of the project fighting your own bugs. the scanner had a bug where two internal commands reported different rule counts for the same rule pack, 24 vs 137, because they used different discovery logic. two tools, one opinion, both mine. that's the real work: making your own tool stop lying to you.
