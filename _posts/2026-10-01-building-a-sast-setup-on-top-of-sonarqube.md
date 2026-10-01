---
layout: post
title: "Building a SAST setup on top of SonarQube"
date: 2026-10-01
author: bhanuharya
tags: [appsec, sast, sonarqube, jenkins, flutter]
---

I wanted a SAST setup for a set of mobile and web repos, mostly Flutter apps and a few web apps. The developers already work in SonarQube. They review hotspots there and their builds wait on its quality gate. So I wanted the security findings in SonarQube too, not in a separate dashboard nobody opens.

## What Community Edition doesn't cover

| Gap | Why it mattered |
|---|---|
| Dart security rules | Flutter apps get very little security coverage out of the box. |
| Secrets in git history | A key deleted last year still lives in the history. |
| Vulnerable dependencies | Dozens of advisories per repo, nowhere to see them. |
| Old findings | First scan of an old repo: hundreds of issues. Nobody fixes hundreds. |

There are open-source engines for each of these: OpenGrep for code patterns, Gitleaks for secrets, Trivy for dependencies. Running them was quick. Getting their results into SonarQube in a form people would review took most of the time.

## First try: external issues

Sonar can import other tools' findings as "external issues", so I started there. The first import: 77 findings exported, zero visible. I assumed the import had failed. It hadn't. My rule names didn't match Sonar's `external_<engine>:<rule>` format, so the issues were there and my filter couldn't see them.

With the names fixed, 249 of 255 findings showed up. The other six were in dotfiles Sonar doesn't index. Then some quieter problems:

* narrow source scopes left out the dependency findings
* scanning the whole tree collided with `sonar.tests`
* everything landed under Issues, never under Security Hotspots

That last one decided it. External issues have no rule page and can't go through hotspot review, and people scroll past them. So I wrote a plugin that registers the findings as native Sonar rules. The [Dart post]({% post_url 2026-10-01-dart-security-sonarqube-community %}) covers how that part works.

## What I ended up with

SonarQube stays as it was. The missing engines run beside it, and their findings come in as native Sonar issues.

* **[`sdt`](https://github.com/bhanuharya/secure-development-tools)**, a small Go CLI, runs the three engines and writes one `findings.json`. Every finding gets a fingerprint.
* **A SonarQube plugin** imports those findings as vulnerabilities and security hotspots, with descriptions and fix guidance, Dart included. To a developer they look like any other Sonar issue.
* **A baseline** built from the target branch's fingerprints. Anything already there counts as existing, so only what you just added is new.
* **Scanner errors fail the build.** If an engine errors, the run exits with code 3. Every run writes a manifest with checksums.
* **A Word report** built from Sonar's data, because that's what gets attached to a release ticket.
* **A Jenkins library**, so one job can scan any repo, either a whole branch or one PR.

Sonar still runs its own analysis and quality gate on top.

## Things that bit me

**Jenkins env vars are case-insensitive.** My job had a parameter called `branch`. The library exported `BRANCH` for the scan script, and the script kept failing with `BRANCH: parameter null or not set`. Jenkins merges environment names case-insensitively, so `BRANCH` got folded into the parameter's lowercase key, and bash, which *is* case-sensitive, saw nothing. Same with `pr_id` and `PR_ID`. The fix: pass them as `SDT_SCAN_*` and rename them right before the script runs.

**My first PR scan scanned the whole branch.** I passed the base branch to the scanner and assumed it would only look at the diff. On a real PR it reported 117 findings, 115 of them dependency CVEs, from a PR that touched 15 files and no lockfiles. Only secret scanning was limited to the PR's commits. The baseline fixed it. Scan the target branch first, then the PR:

```
[sdt] baseline: full scan of origin/main
baseline created: .secure-dev/baseline.json (119 entries)
[sdt] pull request adds 0 of 117 findings (the rest already exist on the target branch)
```

Sonar's own PR analysis only looks at new code too, so the two now agree. A PR scan takes about twice as long because of the extra target scan.

**The default quality gate fails every PR.** Sonar's default gate wants 80% coverage on new code. My scans don't send a coverage report, so every PR failed on coverage, and people stop looking at builds that are always red. Next I'm setting up a security-only gate: no new vulnerabilities, and every new hotspot reviewed.

**Merged PRs are awkward.** Once a PR is merged, its branch is usually deleted and `main` already contains it, so a baseline from `main` finds nothing new. Checking a merged PR means comparing the two parents of the merge commit. I haven't built that yet.

## Where it is now

It runs on a local Jenkins and pulls repos from Bitbucket. One job has a dropdown for `branch` or `pull-request`. Findings go to SonarQube and each build keeps its reports. I still start PR scans by hand, because Bitbucket Cloud can't reach a Jenkins on localhost.

It's pre-release and the schema will change. So far it does what I wanted: developers stay in SonarQube, and a PR shows them only the security issues it added.

Code: [github.com/bhanuharya/secure-development-tools](https://github.com/bhanuharya/secure-development-tools)
