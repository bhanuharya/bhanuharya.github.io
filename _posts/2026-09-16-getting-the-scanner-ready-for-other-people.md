---
layout: post
title: "Getting the scanner ready for other people"
date: 2026-09-16
author: bhanuharya
tags: [security, devsecops, ci, dart, side-project]
---

A tool that works on my machine and a tool someone else can pick up are two different projects. This week went into the second one.

The repo is [secure-development-tools](https://github.com/bhanuharya/secure-development-tools). The scanner has been running for a while, so this pass was about everything around it.

## The README described intentions

The old one listed the stack I meant to have. The new one opens with a run I can reproduce: the deliberately vulnerable fixture app in the repo, 12 findings, four blockers, exit code 1.

```
$ SDT_RULES_PACK_DIR=$PWD/rules/opengrep-rules \
    sdt scan --profile full --config examples/sample-run/demo.secure-dev.yaml \
      --cache /tmp/sdt-cache --output /tmp/sdt-reports
sdt: status=policy_failed findings=12 (critical=3 high=3 medium=6 low=0 info=0 unknown=0) blockers=4 warnings=0
  BLOCK opengrep:00003 sha256:8f5ffe7cea5c (block-new-high-sast)
  BLOCK trivy-fs:00005 sha256:25b8456a83eb (block-new-critical-dependencies)
$ echo $?
1
```

The rule I set for it: every claim has to point at a command you can re-run. Sections that could not do that came out.

## The parts a repo needs before strangers read it

MIT license, third-party notices, and a security policy. The policy asks for private vulnerability reporting through GitHub advisories and says plainly not to open a public issue with a payload in it. A scanner is a tool people point at their own code, and the first serious bug report should not arrive in public.

One wrinkle I did not expect: an MIT file at the root does not relicense the vendored rule subsets. Those stay under the Semgrep Rules License, so the built-in rule bundle should not be shipped inside a competing scanning product. That is now written down instead of living in my head.

## CI, four jobs

- `go`: gofmt, vet, build, test
- `rules`: installs a pinned OpenGrep, then `sdt rules verify` checks the bundle manifest hashes and runs the per-rule tests
- `tools`: py_compile over the offline helpers
- `gate-smoke`: installs the pinned scanners, runs the vulnerable fixture through the whole gate, and asserts it blocks with all four artifacts written even when the policy fails

The badge went up only after main was green. Dependabot covers the Go module, the actions, and the Python tooling.

## A Flutter app that was not being scanned

Detection saw a Flutter project only through its `android/` folder, so `sdt detect` reported `[java kotlin yaml]`, OpenGrep returned `configuration_error` for having no matching local rules, and because OpenGrep is a required scanner, every full run ended `execution_failed` with exit 3. Roughly 1500 Dart files got no SAST coverage while the pipeline looked like it had done its job.

The engine was not the problem. OpenGrep 1.29 supports Dart, which I checked with a throwaway probe rule before writing anything. The gap was detection plus a missing rule pack, so the fix was a rule pack, Dart wired into detection, and a converter so analyzer output lands in the same finding schema as everything else.

## What is still open

The known-limits section in the README is the honest version of this list:

- subdirectory project roots still need two overrides, an absolute rule pack path and an absolute cache, because relative paths stop agreeing between the runtime and its child processes
- a full self-scan exits 1 on purpose: 127 findings, 49 blockers, because the tree ships vulnerable fixtures and rule test data
- `src/` is the superseded Python control plane. It is not hardened, most first-party findings sit there, and its tests are not wired into CI
- ADR 0003 still documents the old fingerprint algorithm while the code emits occurrence-level identity
- the version is 0.1.0-dev and the schemas are not a compatibility contract yet

None of that is fixed. It is written down, which is the part that usually gets skipped.

## Where it is

Green CI, an MIT license, a security policy, and Dart coverage. Someone who clones it can reproduce the run in the README instead of asking me what it does.
