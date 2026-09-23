---
layout: post
title: "Hermes at home"
date: 2026-08-19
author: bhanuharya
tags: [agents, self-hosting, automation, security]
redirect_from:
  - /2026/08/19/building-a-small-self-hosted-agent-system-with-hermes.html
---

I set up Hermes on an old ThinkPad because I wanted an assistant that could use tools and remember project context without sending every task to an expensive model. It started as a few scripts and bots. It has grown into a system I have to maintain, so this is a snapshot of how it is put together and where I still do not trust it.

I leave hostnames, addresses, bot IDs, paths, schedules, and provider details out of this post.

## The hardware

An unused ThinkPad was enough for a small home server. It runs Ubuntu 24.04 LTS, and the services are reachable only over my private network.

| Component | Specification |
|---|---|
| Processor | AMD Ryzen 5 PRO 4650U |
| Memory | 30 GiB RAM |
| Storage | 212 GiB NVMe |

## A snapshot of the host

I check load, memory, disk, and temperature when I troubleshoot or before a heavier job. This is one reading, not a capacity guarantee:

```text
== uptime and load ==
up 5 days, 15 hours, 41 minutes
load average: 0.45, 0.50, 0.46

== memory ==
Mem: 30Gi total · 6.5Gi used · 4.7Gi free · 19Gi cache · 24Gi available

== root filesystem ==
212G total · 118G used · 84G available · 59% used

== processors ==
logical CPUs: 12

== temperatures ==
thermal zone 0: 44.0°C
thermal zone 1: 46.0°C
```

## Keeping services available

The services run under `systemd`, so they restart after a crash and I can inspect their logs without keeping a terminal open. Restart policy is not health monitoring. I still check disk, temperature, and network reachability, and plan for reboots and battery wear.

## Operating system and network boundary

The host runs Ubuntu 24.04. Remote access is through Tailscale. Agent gateways and dashboards are not public. Tailscale controls reachability, not authorization, so services still need their own authentication and least-privilege settings.

Tokens stay out of prompts, posts, and source code. I keep them in local secret storage and rotate or revoke them when their purpose ends.

## Limits

This is a personal setup, not a production reference architecture. Private networking, containers, and separate profiles reduce exposure; none proves an agent or host is safe. I still review sensitive actions and assume configuration mistakes can happen.

## The basic architecture

The main split is between profiles with private memory and the tools they can share:

<figure class="diagram-wrap">
<svg class="architecture-diagram architecture-diagram-wide" style="display:block;width:100%;height:auto" preserveAspectRatio="xMidYMid meet" viewBox="0 0 760 650" role="img" aria-labelledby="architecture-title architecture-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="architecture-title">Hermes multi-profile architecture</title>
  <desc id="architecture-desc">Chat clients connect to three isolated agent profiles. Each profile has private memory, while selected skills and tools are shared before tasks reach the model router.</desc>
  <defs>
    <marker id="arrow-architecture" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="#777" />
    </marker>
    <style>
      .arch-box { fill:#0b0b0b; stroke:#bdbdbd; stroke-width:1.4; rx:4; }
      .arch-shared { fill:#151515; stroke:#f0f0f0; stroke-width:1.4; rx:4; }
      .arch-text { fill:#f0f0f0; font:14px monospace; text-anchor:middle; }
      .arch-muted { fill:#999; font:11px monospace; text-anchor:middle; }
      .arch-line { stroke:#777; stroke-width:1.4; fill:none; marker-end:url(#arrow-architecture); }
    </style>
  </defs>

  <rect class="arch-box" x="280" y="20" width="200" height="55" />
  <text class="arch-text" x="380" y="44">chat clients</text>
  <text class="arch-muted" x="380" y="62">separate bot entries</text>

  <rect class="arch-box" x="20" y="130" width="200" height="62" />
  <rect class="arch-box" x="280" y="130" width="200" height="62" />
  <rect class="arch-box" x="540" y="130" width="200" height="62" />
  <text class="arch-text" x="120" y="157">profile A</text>
  <text class="arch-muted" x="120" y="176">general</text>
  <text class="arch-text" x="380" y="157">profile B</text>
  <text class="arch-muted" x="380" y="176">project</text>
  <text class="arch-text" x="640" y="157">profile C</text>
  <text class="arch-muted" x="640" y="176">isolated</text>

  <line class="arch-line" x1="380" y1="75" x2="380" y2="100" />
  <line class="arch-line" x1="380" y1="100" x2="120" y2="130" />
  <line class="arch-line" x1="380" y1="100" x2="380" y2="130" />
  <line class="arch-line" x1="380" y1="100" x2="640" y2="130" />

  <rect class="arch-box" x="20" y="235" width="200" height="62" />
  <rect class="arch-box" x="280" y="235" width="200" height="62" />
  <rect class="arch-box" x="540" y="235" width="200" height="62" />
  <text class="arch-text" x="120" y="262">memory A</text>
  <text class="arch-muted" x="120" y="281">private context</text>
  <text class="arch-text" x="380" y="262">memory B</text>
  <text class="arch-muted" x="380" y="281">private context</text>
  <text class="arch-text" x="640" y="262">memory C</text>
  <text class="arch-muted" x="640" y="281">private context</text>

  <line class="arch-line" x1="120" y1="192" x2="120" y2="235" />
  <line class="arch-line" x1="380" y1="192" x2="380" y2="235" />
  <line class="arch-line" x1="640" y1="192" x2="640" y2="235" />

  <rect class="arch-shared" x="100" y="350" width="560" height="70" />
  <text class="arch-text" x="380" y="378">shared capabilities</text>
  <text class="arch-muted" x="380" y="399">skills · tools · local services</text>

  <line class="arch-line" x1="120" y1="297" x2="120" y2="330" />
  <line class="arch-line" x1="120" y1="330" x2="380" y2="350" />
  <line class="arch-line" x1="380" y1="297" x2="380" y2="350" />
  <line class="arch-line" x1="640" y1="297" x2="640" y2="330" />
  <line class="arch-line" x1="640" y1="330" x2="380" y2="350" />

  <rect class="arch-shared" x="100" y="470" width="560" height="70" />
  <text class="arch-text" x="380" y="498">task routing</text>
  <text class="arch-muted" x="380" y="519">fast · cheap · specialist · deep</text>
  <line class="arch-line" x1="380" y1="420" x2="380" y2="470" />
</svg>
</figure>

<figure class="diagram-wrap diagram-wrap-mobile">
<svg class="architecture-diagram architecture-diagram-mobile" preserveAspectRatio="xMidYMid meet" viewBox="0 0 320 520" role="img" aria-labelledby="architecture-mobile-title architecture-mobile-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="architecture-mobile-title">Hermes mobile architecture</title>
  <desc id="architecture-mobile-desc">Chat clients branch to three isolated agent profiles, each with private memory, before converging on shared capabilities and task routing.</desc>
  <defs>
    <marker id="arrow-architecture-mobile" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="#777" />
    </marker>
    <style>
      .mobile-box { fill:#0b0b0b; stroke:#bdbdbd; stroke-width:1.4; rx:4; }
      .mobile-shared { fill:#151515; stroke:#f0f0f0; stroke-width:1.4; rx:4; }
      .mobile-text { fill:#f0f0f0; font:13px monospace; text-anchor:middle; }
      .mobile-muted { fill:#999; font:10px monospace; text-anchor:middle; }
      .mobile-line { stroke:#777; stroke-width:1.4; fill:none; marker-end:url(#arrow-architecture-mobile); }
      .mobile-branch { stroke:#777; stroke-width:1.4; fill:none; }
    </style>
  </defs>

  <rect class="mobile-box" x="40" y="18" width="240" height="56" />
  <text class="mobile-text" x="160" y="42">chat clients</text>
  <text class="mobile-muted" x="160" y="61">separate bot entries</text>

  <line class="mobile-line" x1="160" y1="74" x2="160" y2="104" />
  <line class="mobile-branch" x1="53" y1="104" x2="267" y2="104" />
  <line class="mobile-line" x1="53" y1="104" x2="53" y2="130" />
  <line class="mobile-line" x1="160" y1="104" x2="160" y2="130" />
  <line class="mobile-line" x1="267" y1="104" x2="267" y2="130" />

  <rect class="mobile-box" x="5" y="130" width="96" height="54" />
  <text class="mobile-text" x="53" y="153">profile A</text>
  <text class="mobile-muted" x="53" y="171">general</text>
  <line class="mobile-line" x1="53" y1="184" x2="53" y2="210" />
  <rect class="mobile-box" x="5" y="210" width="96" height="54" />
  <text class="mobile-text" x="53" y="233">memory A</text>
  <text class="mobile-muted" x="53" y="251">private</text>

  <rect class="mobile-box" x="112" y="130" width="96" height="54" />
  <text class="mobile-text" x="160" y="153">profile B</text>
  <text class="mobile-muted" x="160" y="171">project</text>
  <line class="mobile-line" x1="160" y1="184" x2="160" y2="210" />
  <rect class="mobile-box" x="112" y="210" width="96" height="54" />
  <text class="mobile-text" x="160" y="233">memory B</text>
  <text class="mobile-muted" x="160" y="251">private</text>

  <rect class="mobile-box" x="219" y="130" width="96" height="54" />
  <text class="mobile-text" x="267" y="153">profile C</text>
  <text class="mobile-muted" x="267" y="171">isolated</text>
  <line class="mobile-line" x1="267" y1="184" x2="267" y2="210" />
  <rect class="mobile-box" x="219" y="210" width="96" height="54" />
  <text class="mobile-text" x="267" y="233">memory C</text>
  <text class="mobile-muted" x="267" y="251">private</text>

  <line class="mobile-branch" x1="53" y1="264" x2="53" y2="290" />
  <line class="mobile-branch" x1="160" y1="264" x2="160" y2="290" />
  <line class="mobile-branch" x1="267" y1="264" x2="267" y2="290" />
  <line class="mobile-branch" x1="53" y1="290" x2="267" y2="290" />
  <line class="mobile-line" x1="160" y1="290" x2="160" y2="316" />

  <rect class="mobile-shared" x="30" y="316" width="260" height="62" />
  <text class="mobile-text" x="160" y="342">shared capabilities</text>
  <text class="mobile-muted" x="160" y="361">skills · tools · local services</text>
  <line class="mobile-line" x1="160" y1="378" x2="160" y2="414" />

  <rect class="mobile-shared" x="30" y="414" width="260" height="62" />
  <text class="mobile-text" x="160" y="440">task routing</text>
  <text class="mobile-muted" x="160" y="459">fast · cheap · specialist · deep</text>
</svg>
</figure>

The important boundary is between shared capabilities and private memory.

Skills are procedural. They describe how a task should be performed and can be reused. Memory is contextual. It may contain preferences, project details, or conversation history, so it should not automatically be shared between unrelated agents.

That distinction sounds obvious, but it is easy to accidentally create shared state when profiles are assembled from symlinks, shared directories, or common configuration files.

## Routing tasks

I route by rules instead of asking another model to choose a model. Scripts handle deterministic work; routine questions go to a fast general model; bounded coding tasks go to a coding model; higher-risk analysis gets a stronger model and review. The point is to spend more only when the task needs it.

## Scheduled work

Recurring checks run as scripts, not agents. They use authorized scope, stay read-only or non-intrusive, run in disposable environments where needed, and report changes against a baseline. For many jobs, the whole pipeline is `script → stdout → notification`.

## The tooling layer

Hermes is the coordination layer, not the entire security stack. Some of the work is handled by separate tools that can be used independently or called as part of a larger workflow.

Two public repositories are part of the tooling used around this setup. They are separate projects rather than components that need an agent to function:

| Repository | Role |
|---|---|
| [secure-development-tools](https://github.com/bhanuharya/secure-development-tools) | Security-scan orchestration for source-code, application, secrets, and dependency checks, with findings collected into a single workflow. |
| [cti-radar](https://github.com/bhanuharya/cti-radar) | A self-hosted CTI and attack-surface correlation dashboard for authorized findings, assets, vulnerabilities, and mitigation tracking. |

The relationship is closer to a control plane sitting above several independent tools:

<figure class="diagram-wrap">
<svg class="architecture-diagram" preserveAspectRatio="xMidYMid meet" viewBox="0 0 900 360" role="img" aria-labelledby="tooling-title tooling-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="tooling-title">Hermes tooling layer</title>
  <desc id="tooling-desc">Hermes coordinates independent security tools and local jobs, which produce findings, reports, logs, and alerts.</desc>
  <defs>
    <marker id="arrow-tooling" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#777" />
    </marker>
    <style>
      .tool-box { fill:#0b0b0b; stroke:#bdbdbd; stroke-width:1.5; rx:4; }
      .tool-main { fill:#151515; stroke:#f0f0f0; stroke-width:1.5; rx:4; }
      .tool-text { fill:#f0f0f0; font:16px monospace; text-anchor:middle; }
      .tool-muted { fill:#999; font:13px monospace; text-anchor:middle; }
      .tool-line { stroke:#777; stroke-width:1.5; fill:none; marker-end:url(#arrow-tooling); }
    </style>
  </defs>

  <rect class="tool-main" x="300" y="20" width="300" height="65" />
  <text class="tool-text" x="450" y="48">Hermes</text>
  <text class="tool-muted" x="450" y="69">agent control and routing</text>

  <line class="tool-line" x1="450" y1="85" x2="160" y2="145" />
  <line class="tool-line" x1="450" y1="85" x2="450" y2="145" />
  <line class="tool-line" x1="450" y1="85" x2="740" y2="145" />

  <rect class="tool-box" x="35" y="145" width="250" height="70" />
  <rect class="tool-box" x="325" y="145" width="250" height="70" />
  <rect class="tool-box" x="615" y="145" width="250" height="70" />
  <text class="tool-text" x="160" y="173">secure-development-tools</text>
  <text class="tool-muted" x="160" y="195">scan orchestration</text>
  <text class="tool-text" x="450" y="173">cti-radar</text>
  <text class="tool-muted" x="450" y="195">finding correlation</text>
  <text class="tool-text" x="740" y="173">local jobs</text>
  <text class="tool-muted" x="740" y="195">scripts and scheduled checks</text>

  <line class="tool-line" x1="160" y1="215" x2="450" y2="280" />
  <line class="tool-line" x1="450" y1="215" x2="450" y2="280" />
  <line class="tool-line" x1="740" y1="215" x2="450" y2="280" />

  <rect class="tool-main" x="240" y="280" width="420" height="60" />
  <text class="tool-text" x="450" y="306">findings · reports · logs · alerts</text>
  <text class="tool-muted" x="450" y="326">outputs remain useful without an agent</text>
</svg>
</figure>

These tools still run without Hermes. It schedules work or summarizes results.

## Verification as a separate concern

For tasks where an agent is involved, I also experiment with using a separate model as a verifier.

The verifier does not replace the primary model. It reviews multiple candidate outputs or ranks possible answers, which is useful when the task has several plausible solutions.

This creates a simple separation:

```text
agent produces candidates
            │
            ▼
      verifier compares
            │
            ▼
      best result selected
```

It is not perfect, but it is often more useful than asking the original model to confidently judge its own answer.

## Managing model lanes and usage

Model management is an engineering problem, not just a model-selection problem.

### Models I use in this system

The system does not need one model to handle every task. I usually keep three practical lanes:

| Model | Typical use |
|---|---|
| GPT-5.6 Luna | Bounded interactive work, market synthesis, and tasks where a strong answer matters more than minimizing every token |
| DeepSeek V4 Flash | Routine implementation, iterative repository work, delegated coding, and tasks where speed and cost matter |
| DeepSeek V4 Pro | Security review, difficult debugging, architecture decisions, and authentication or infrastructure changes |

This is not a rigid ranking. A smaller model is often the better choice when the task is clear and repeatable, while a stronger lane is justified when a wrong answer would create security, operational, or financial consequences. Hermes remains responsible for checking important results rather than treating a worker's completion message as proof.

| Constraint | Why it matters |
|---|---|
| Cost and token budgets | Repeated context can make cheap calls expensive |
| Provider rate limits | A lane may become unavailable or restricted |
| Context size | Large prompts reduce efficiency and may exceed limits |
| Cache behavior | Stable prompts and reusable context improve cost and latency |
| Fallback quality | A reachable fallback may still lack the required capability |

The routing principle is:

<div class="model-routing" aria-label="Model routing principle">
  <div class="routing-node routing-source">deterministic task</div>
  <div class="routing-arrow" aria-hidden="true">▼</div>
  <div class="routing-node routing-local">local tool or script</div>
  <div class="routing-branches">
    <div class="routing-branch">
      <span class="routing-label">routine task</span>
      <span class="routing-connector" aria-hidden="true">→</span>
      <strong>cheaper model lane</strong>
    </div>
    <div class="routing-branch">
      <span class="routing-label">specialist task</span>
      <span class="routing-connector" aria-hidden="true">→</span>
      <strong>specialist model</strong>
    </div>
    <div class="routing-branch">
      <span class="routing-label">high-impact task</span>
      <span class="routing-connector" aria-hidden="true">→</span>
      <strong>stronger model + verification</strong>
    </div>
  </div>
  <div class="routing-arrow" aria-hidden="true">▼</div>
  <div class="routing-node routing-fallback">tested fallback lane</div>
</div>

Stable instructions, reusable skill context, explicit routing rules, and tested fallbacks help the system remain efficient when costs, limits, or provider availability change.

## Securing search, fetch, and crawl workflows

Web retrieval is useful, but search results, fetched pages, and crawled documents are untrusted input. A page can contain instructions aimed at the agent, misleading content designed to poison a summary, or text that tries to change the scope of the original task.

I treat the retrieval layer as a data pipeline, not as an extension of the agent's instruction set:

```text
user intent
    │
    ▼
search / fetch / crawl
    │
    ▼
untrusted source content
    │
    ▼
extract · limit · label · preserve provenance
    │
    ▼
reason about the content as data
    │
    ▼
answer only within the original task scope
```

The important rule is that retrieved content can describe instructions without becoming instructions. A web page saying “ignore previous instructions,” requesting credentials, or asking the agent to call another tool is still just page content. It does not have authority over the workflow.

Some of the controls I use or consider important are:

```text
├── treat search results and page text as untrusted data
├── keep user intent separate from retrieved content
├── preserve source URLs and provenance for claims
├── limit crawl depth, page size, and request scope
├── avoid sending credentials or private context to arbitrary pages
├── do not execute scripts, downloads, or page instructions by default
├── isolate browser and fetch tooling where practical
└── require human judgment before sensitive external actions
```

Prompt injection is only one part of the problem. Content poisoning can also happen when a source is outdated, copied from another source, selectively edited, or deliberately written to produce a misleading conclusion. Multiple sources, timestamps, primary documentation, and explicit uncertainty are more useful defenses than pretending that retrieved text is automatically trustworthy.

The security boundary therefore sits between retrieval and action. Search, fetch, and crawl tools may collect evidence, but they should not silently authorize tool calls, disclose secrets, modify systems, or expand the task's scope.

## What I would keep

A few choices have held up:

- Separate memory by profile; share skills only when they are genuinely common.
- Use scripts for repeatable checks. I do not need a model in the loop to compare a result with yesterday's baseline.
- Route by explicit rules. A second model call to pick the first model is usually wasted work.
- Treat retrieved pages as data, not instructions. Keep the source URL and check important claims against primary sources.

The system is still changing. My next work is better gateway health checks and a cleaner record of which model lane handled each job.
