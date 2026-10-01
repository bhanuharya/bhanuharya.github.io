---
layout: post
title: "Dart security rules for SonarQube Community, with OpenGrep"
date: 2026-10-01
author: bhanuharya
tags: [appsec, sast, sonarqube, flutter, dart, opengrep]
---

Sonar has its own Dart and Flutter analyzer, but it ships in [Developer Edition and up](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/dart). On the free Community Build you get Dart through [sonar-flutter](https://github.com/insideapp-oss/sonar-flutter), a community plugin. It adds the `dart` language and imports `dart analyze` results. Those are lints. A Flutter app that turns off TLS certificate checks scans clean.

I wanted real security findings for Flutter apps on Community, showing up the same way Sonar's own Java or Python security issues do. This post is how I got there with OpenGrep and a small plugin.

## The pieces

| Piece | Job |
|---|---|
| sonar-flutter | Registers the `dart` language and imports `dart analyze` lints |
| OpenGrep + Dart rules | Finds the security problems |
| [sonar-opengrep-dart](https://github.com/bhanuharya/sonar-opengrep-dart) | Turns each OpenGrep rule into a Sonar rule and puts results on it |

OpenGrep runs in CI and writes JSON. The plugin doesn't run anything itself. It reads that JSON during `sonar-scanner`.

## Why I didn't use SARIF

Sonar can import SARIF or its generic format as "external issues". External issues show up, but they can't be Security Hotspots, they don't count in the CWE / OWASP reports, they have no rule page, and you can't switch them on or off in a quality profile. In practice people scroll past them.

A plugin can register rules on the server like any language analyzer does. Then a finding is a normal Sonar issue: it has a rule description, a "How to fix it" tab, a CWE link, and hotspots go through the usual review.

## A rule

Rules are plain OpenGrep YAML. The `metadata` block is what the plugin reads to build the Sonar rule:

```yaml
- id: scp.dart.tls.disable-certificate-validation
  languages: [dart]
  severity: ERROR
  message: A badCertificateCallback that always returns true disables TLS certificate validation ...
  metadata:
    name: "TLS certificate validation should not be disabled"
    category: security
    cwe: ["CWE-295"]
    owasp: ["A02:2021 - Cryptographic Failures"]
    confidence: HIGH
    remediation: Remove the override, or validate the chain against a pinned certificate.
  pattern-either:
    - pattern: $CLIENT.badCertificateCallback = ($A, $B, $C) => true
    - pattern: $CLIENT.badCertificateCallback = ($A, $B, $C) { return true; }
```

The type comes from the metadata. `confidence: HIGH` or a taint rule (`mode: taint`) becomes a Vulnerability. Any other security rule becomes a Security Hotspot, since a person has to look at the context. `owasp-mobile` and `masvs` keys become tags, because Sonar has no mobile standard of its own.

The bundled pack has 18 rules so far. Each one has a vulnerable and a safe fixture for `opengrep scan --test`:

* TLS validation disabled, MD5/SHA-1, AES-ECB, zero keys, static IVs, insecure random
* SQL injection and untrusted WebView scripts (taint)
* `http://` URLs, secrets in SharedPreferences or logs, hardcoded API keys
* WebView JavaScript channels, `biometricOnly: false`, deep-link handlers with no validation

You can point the server at your own rule directories too.

## Things I didn't expect

**A plugin can't add rules to another plugin's built-in profile.** The default Dart profile belongs to sonar-flutter. My rules can't go into it, and a project uses one profile per language. So the setup includes a script that copies sonar-flutter's profile, activates the OpenGrep rules in it, and makes it the default.

**sonar-flutter runs `flutter analyze` itself by default.** If `flutter` isn't on the scanner's PATH, the whole analysis fails. In CI I run `dart analyze --format=machine` first and point sonar-flutter at that file with `sonar.dart.analyzer.mode=MANUAL` and `report.mode=MACHINE`.

**Zero-length diagnostics crash the import.** Some `dart analyze` results come with a length of 0, file-name lints at line 1 for example. sonar-flutter throws on those and the whole scan fails. My scan script rewrites them to a one-character span before handing the file over.

**Secrets in git history have no line to sit on.** A key deleted two years ago is still in every clone, but the file isn't in the checkout anymore. Those findings go on the project instead of a file, as their own rule (`sdt:secret-in-history`), so they don't get dropped.

That last one comes from the wider setup: [sdt](https://github.com/bhanuharya/secure-development-tools) runs Gitleaks and Trivy next to OpenGrep, and the plugin also imports secrets and vulnerable dependencies as native rules. A dependency nothing imports becomes a hotspot. One that's imported becomes a vulnerability.

## Limits

This is pattern matching, plus OpenGrep's taint mode for a couple of rules. It is a lot shallower than a dedicated analyzer. If you have Developer Edition, use Sonar's own Dart analysis, and treat these rules as an extra layer at most.

The plugin is tested in CI against SonarQube 9.9 LTA, 10.7 and the latest Community Build, with sonar-flutter 0.5.2. It's early, and the rule pack is small. If you write Flutter on Community and have a rule idea, I'd like to hear it.
