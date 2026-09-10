---
layout: post
title: "Reconciling a homegrown security scanner with SonarQube's external-issue import"
date: 2026-09-10
author: bhanuharya
tags: [security, sast, devsecops, sonarqube, jenkins, go, self-hosting]
---

I built a Go-based scanning pipeline — SAST, secrets, and dependency scanning with a policy gate — and ran it against three production-lineage Java microservices from a financial-services codebase. Service names, package paths, and internal identifiers are redacted throughout; the interesting part was never the names anyway. The findings were then imported into a local SonarQube 10.7 lab as external issues, and the reconciliation is where most of this post's lessons come from.

Plain-language version: a custom scanner found 255 issues across three services, and 249 of them (97.6%) show up in SonarQube's Issues tab with the right rule keys. Getting from "gap = 77" to "gap = 6" took one naming convention fix and taught me three ways Sonar silently drops findings.

## The pipeline

The tool ([secure-development-tools](https://github.com/bhanuharya/secure-development-tools), `sdt`) bundles three scanners behind one policy gate:

```text
opengrep    147 rules, taint + pattern SAST
gitleaks    secret detection
trivy-fs    dependency / IaC scanning
```

One scan produces `findings.json`, SARIF, a PDF report, and a SonarQube external-issue export. The pipeline is deliberately boring: preflight (`sdt doctor`), a plan with a content digest, scan, policy evaluation, report. Jenkins runs it as a sidecar next to the existing Sonar analysis, advisory-first with a strict toggle:

```text
Result                          Advisory    Strict
------------------------------  --------    ------
scan complete, policy passes    success     success
scan complete, policy fails     unstable    failure
incomplete/failed execution     failure     failure
cancelled                       aborted     aborted
```

The rule that matters: publish results *before* applying the blocking decision, so a strict failure still leaves its findings somewhere reviewable.

## Three services, snapshot scans

The three services were scanned with the full profile. One honest caveat baked into the reports: these were snapshot commits (a fresh local commit of the exported tree), not full VCS history — so secrets findings are tree-only, and historical secrets coverage is explicitly marked unavailable. The exports also carried Windows `Zone.Identifier` metadata files, which are copy artifacts, not source; they got excluded before the snapshot commit, and the exclusion is verified by checking the tracked file list, not by trusting the ignore rules.

```text
Service   Findings   SAST   Secrets   Deps   Misconfig   Blockers
--------  --------   ----   -------   ----   ---------   --------
A              77      21       37      19           0         49
B              91      30       45      14           2         58
C              87      27       40      18           2         50
```

Secrets dominate the raw counts. That is normal for a first pass with a secrets scanner and does not mean 122 exploitable leaks — gitleaks flags test fixtures and example keys too. The point of the review workflow is to turn raw counts into confirmed findings; the pipeline's job is to make sure nothing is silently missing.

## External imports land in Issues, not Security Hotspots

The first confusion: after importing 77 findings into SonarQube, the Security Hotspots page was empty and it looked like the import had failed. It hadn't. SonarQube routes externally imported issues into **Issues**; the Security Hotspots workflow only ever contains Sonar's native hotspot rules. An empty Hotspots page says nothing about your import.

This matters operationally: if your team reviews security findings in Hotspots, an external import will never appear there, and no filter will make it appear. Either review external findings in Issues, or treat the custom pipeline's own report as the review surface.

## Reconciliation: from gap = 77 to gap = 6

The first reconciliation attempt was demoralizing: 77 findings exported, zero visible under the expected rule keys. The cause was my own rule-key format. SonarQube addresses external rules as `external_<engine>:<rule-key>`, and my queries were using the wrong engine prefix. With the correct prefix the picture flipped:

```text
Project    SDT findings   Imported   Native issues   Native hotspots
---------  ------------   --------   -------------   ---------------
A                   77         75           6,338               4
B                   91         89           3,850               8
C                   87         85           7,220               3
```

249 of 255 (97.6%). The entire remaining gap is one systematic cause: findings on hidden dotfiles (`.yo-rc.json`), which Sonar's scanner never indexes, so those issues have nowhere to attach. Everything else imports cleanly, including per-dependency CVEs on `pom.xml`.

Worth stating plainly: Sonar's native hotspots (4, 8, 3) are not a verdict that the services are clean — they are a different rule set with a much narrower reach. The custom pipeline's 49–58 blockers per service are the wider net. Both numbers are true at once; they measure different things.

## Three ways Sonar silently drops findings

1. **Dotfiles are never indexed.** Any external issue pointing at a dotfile is ignored for unknown files, with only a log line. If your scanner flags `.env`, `.npmrc`, or similar, expect those findings to be un-reconcilable in Sonar and keep them in the pipeline's own report.
2. **Narrow source scope hides dependency findings.** With `sonar.sources` limited to `src/main`, external issues on `pom.xml` at the tree root disappear. Widening to the tree root with explicit exclusions (`reports/**`, caches, generated files) fixed it — and introduced the next trap:
3. **`sonar.tests` conflicts with tree-wide sources.** With sources covering everything, the repo's own `sonar.tests` setting caused a "file can't be indexed twice" analysis failure. Override `sonar.tests` when using tree-wide sources.

None of these are exotic. All three produce a *quieter* Sonar project, which looks like success.

## Fixes to the pipeline itself

The pilot also shook out three defects in `sdt`:

- **Manifest verification anchored paths to the wrong root.** Relative rule-pack paths resolved against the process CWD, so `sdt rules verify` from a clean checkout reported eleven "found 0" entries. Fix: anchor both the pack root and every relative path to the repo root, so relative and absolute paths verify identically.
- **`doctor` and `verify` used different rulers.** Doctor counted rule files with a shallow two-level walk and reported 24 while verify's recursive discovery counted 137 — same bundle, two answers. Fix: one shared discovery function everywhere, with a shallow fallback only when no pack exists.
- **An unborn `HEAD` failed with a bare git error.** A fresh `git init` with no commits now produces a message that says commit once or pass an explicit `--head`, instead of `fatal: Needed a single revision` with no context.

Also in the same pass: SARIF output now guarantees non-empty locations per result, because an empty-location record is a finding that downstream consumers can't display.

## Tree-clean is not history-clean

The pre-rollout audit found the exact failure mode the plan predicted: a sanitize commit had scrubbed internal identifiers from the current tree of the public repo, but earlier published commits — including one already merged — still contained the pre-sanitization content. Auditing the final diff says nothing about earlier commits; the history has to be walked with the same terms.

Resolution is a governance question, not a technical one. The contaminated values are internal names rather than credentials, but a rewrite touches `origin/main`, breaks every clone, and needs a coordinated decision. That decision is still open, which is itself the honest status.

## Lab notes

Two things the local SonarQube lab taught, briefly:

- A restart produced `cluster_block_exception ... no master` during report upload, and the scanner-side error — "The 'report' parameter is missing" — pointed nowhere near the cause. The lab's start script had been wiping Sonar's `data` directory on every launch, killing the embedded Elasticsearch index. Fix: only clear `temp`. The lesson generalizes: when an upload fails server-side, read the server log before debugging the client.
- Saving a SonarQube page as HTML captures only the loading shell — the SPA fetches everything after load. It is not a findings export. Use the generated reports.

## What's next

The scan path is now stable enough to trust, which makes the next steps unglamorous on purpose: wire the Jenkins sidecar into PR delivery (links first, inline annotations later), reconcile per-finding identity across runs so a reintroduced issue reopens visibly, and move specific categories — confirmed exposed credentials first — from advisory to strict only after the advisory numbers have been reviewed for a while. Enforcement is the last milestone, not the first.
