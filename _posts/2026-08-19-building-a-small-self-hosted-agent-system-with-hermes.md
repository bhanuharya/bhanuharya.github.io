---
layout: post
title: "Building a Small Self-Hosted Agent System with Hermes"
date: 2026-08-19
author: bhanuharya
tags: [agents, self-hosting, automation, security]
---

I have been experimenting with a small self-hosted agent environment built around Hermes.

The original idea was simple: have an assistant that could remember context, use tools, run scheduled jobs, and help with different kinds of work without turning every task into a large, expensive model call.

Over time, it became less like a single chatbot and more like a small operating environment for agents.

This post is an overview of the design and the decisions behind it. It intentionally leaves out hostnames, addresses, bot identifiers, filesystem paths, schedules, credentials, provider configuration, and details that would make the environment easier to identify or attack.

## The hardware

I could not afford a small fleet of cloud VMs, so the entire thing runs on an old ThinkPad from my college years. It is not exactly enterprise infrastructure, but it is quiet, cheap, and good enough for a personal lab.

| Component | Specification |
|---|---|
| Device | ThinkPad homelab |
| Processor | AMD Ryzen 5 PRO 4650U |
| Memory | 30 GiB RAM |
| Storage | 212 GiB NVMe |
| Operating system | Ubuntu 24.04 LTS |
| Network exposure | Private overlay network only |

The point is not that this hardware is impressive. The point is that a useful agent environment does not need a rack of servers to be worth building. It needs clear boundaries, sensible defaults, and enough capacity to run the workloads that actually matter.

## Operating system and network boundary

The host runs Ubuntu 24.04 LTS. Linux keeps the system understandable: services are explicit, logs are inspectable, scheduled work is visible, and most of the environment can be managed with ordinary tools rather than a large control plane.

Networking is handled through Tailscale as a private overlay. The services are reachable from trusted devices on the tailnet rather than being exposed directly to the public internet. This makes remote access practical without opening every agent gateway, dashboard, or local service to the wider internet.

Tailscale is not treated as a complete security boundary. It controls network reachability, but it does not replace authentication, least privilege, service-level hardening, or careful tool permissions. The useful boundary is layered:

```text
Linux host
    │
    ▼
Tailscale private overlay
    │
    ▼
allowlisted gateways and services
    │
    ▼
profile isolation · authentication · tool constraints
```

The network setup is intentionally unremarkable. There is no need for a public-facing agent endpoint for this kind of personal system, so public exposure is disabled and access stays inside the private overlay.

Tailscale can use a Google identity for authentication, which means the Google account's two-factor authentication becomes part of the access path for trusted devices. That is useful, but it is still only one layer: device approval, service authentication, and least-privilege permissions remain important after a device joins the tailnet.

Keys and tokens are treated as credentials, not as convenient configuration strings. Authentication keys should be scoped as narrowly as possible, rotated when their purpose ends, and revoked if they are exposed. API tokens and service credentials stay outside prompts, blog posts, and source code; they belong in environment-level secret storage or another controlled local mechanism. The goal is to make credential lifetime and ownership visible rather than letting long-lived secrets quietly spread across scripts and services.

The topology is roughly:

```text
trusted device
      │
      │  encrypted Tailscale connection
      ▼
private overlay network
      │
      ▼
Linux homelab host
      ├── Hermes gateways and bot profiles
      ├── local web interfaces
      ├── scheduled security jobs
      └── supporting services and containers
```

The host can still reach the ordinary network for updates, package downloads, and selected external APIs. The important distinction is that outbound connectivity is not the same as inbound public exposure. Services are bound and allowlisted deliberately, while the overlay provides the path for trusted remote access.

## A necessary disclaimer

I do not consider this setup fully secure, and I would not present it as a reference architecture for production use.

It is a personal homelab system with multiple moving parts: agent gateways, model providers, local services, scheduled jobs, shared capabilities, and isolated memories. Each layer introduces its own failure modes, including configuration mistakes, accidental data exposure, prompt injection, provider-side risk, and imperfect isolation.

There are still some measures in place to reduce the risk:

```text
├── private network access rather than public exposure
├── separate profiles and isolated memory
├── limited shared skills and controlled tools
├── read-only and non-intrusive security jobs
├── disposable execution environments where practical
├── no credentials embedded in prompts or source code
├── baseline-based reporting to reduce unnecessary activity
└── manual judgment for sensitive or high-impact actions
```

These measures reduce exposure; they do not eliminate risk. The system is still a work in progress, and anyone building something similar should evaluate it against their own threat model instead of copying the design blindly.

## The basic architecture

The setup runs on a small private Linux host. It is reachable only through a private overlay network, with no public-facing entry point.

There are several isolated bot profiles. Each profile has its own memory and runtime context, while selected skills and tools are shared across the system.

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

| Layer | Purpose | Boundary |
|---|---|---|
| Chat interface | Receives requests and returns results | Separate bot entry points |
| Agent profile | Defines identity, configuration, and context | One profile per operating role |
| Memory | Stores contextual information | Isolated per profile |
| Skills and tools | Provides reusable procedures and capabilities | Shared selectively |
| Gateways | Runs each profile as a service | Separate service processes |
| Model router | Selects an appropriate execution lane | Policy-driven rather than automatic classification |

## Why multiple profiles?

The profiles are not separate personalities for the sake of presentation. They are separate operating contexts.

One profile is general-purpose. Another is dedicated to project and security work. A third is kept isolated for experiments that should not inherit the assumptions or memory of the other profiles.

This separation gives each profile a smaller context and a clearer responsibility. It also reduces the chance that a project-specific instruction or memory entry silently affects unrelated work.

The profiles run through separate gateway services. From the outside, they look like independent bots. Internally, they share a controlled capability layer while retaining separate memory boundaries.

| Profile type | Intended use | Memory | Shared capabilities |
|---|---|---|---|
| General | Everyday assistance and broad tasks | Private | Selected common skills |
| Project | Focused project and security work | Private | Security and automation tools |
| Isolated | Experiments and testing | Private | Only what the experiment needs |

## Routing instead of using one model for everything

One of the more useful changes was moving from a single default model to a policy-driven routing approach.

Different tasks have different requirements:

```text
deterministic task ───────► local tool or script
ordinary reasoning ───────► fast general model
delegated implementation ─► efficient coding model
specialist analysis ──────► specialist model
high-risk reasoning ──────► stronger reasoning model
```

The router does not try to classify every message with another model before doing the actual work. That would add latency, consume tokens, and sometimes make a simple task more complicated than necessary.

Instead, the routing rules are explicit. The task type, required depth, and risk determine which lane is appropriate.

The goal is not to always use the most powerful model. The goal is to use the least expensive and least complex path that is still reliable for the task.

| Task category | Preferred path | Reason |
|---|---|---|
| Deterministic check | Local script or tool | No model call required |
| Routine reasoning | Fast general model | Low latency and lower cost |
| Delegated implementation | Efficient coding model | Suitable for bounded build work |
| Specialist analysis | Specialist model | Better domain performance |
| High-impact reasoning | Stronger reasoning model plus review | More scrutiny for consequential work |

The policy can be represented with simple logic rather than another model call:

```python
if task.is_deterministic:
    execute_local_tool(task)
elif task.requires_specialist_knowledge:
    route_to_specialist_lane(task)
elif task.is_high_impact:
    route_to_deep_reasoning_lane(task)
else:
    route_to_fast_general_lane(task)
```

## Scheduled work without an agent in the loop

Not every useful job needs an LLM.

Some of the recurring work is handled by ordinary scripts and scheduled services. These jobs perform bounded checks, compare the result with a previous baseline, and send an update only when something is new or changed.

This is useful for monitoring because it keeps routine work cheap and predictable. It also avoids asking an agent to repeatedly rediscover the same state.

For security-related checks, the design is intentionally conservative:

```text
authorized scope only
        │
        ▼
read-only or non-intrusive checks
        │
        ▼
disposable execution environment
        │
        ▼
compare with known baseline
        │
        ▼
report only new or changed results
```

The scripts are designed around explicit authorization, bounded requests, no brute force, no credential attempts, no destructive actions, and no exploitation. The agent is not used as a substitute for those controls.

| Control | What it helps with | What it does not guarantee |
|---|---|---|
| Private network access | Reduces public exposure | Does not prevent compromise of an allowed host |
| Read-only checks | Limits the impact of a bad request | Does not make every check harmless |
| Disposable containers | Limits persistent changes | Does not eliminate container or host risk |
| Baseline comparison | Reduces alert noise | Does not detect every new condition |
| No-agent scripts | Removes unnecessary model uncertainty | Does not replace proper review |
| Manual approval | Adds a human decision point | Humans can still make mistakes |

In many cases, the safest and most efficient design is simply:

```text
script → stdout → notification
```

No model call is required.

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

The important design choice is that these tools remain useful without an agent. Hermes can help decide when to use them, interpret their output, or summarize a result, but the underlying scanners and dashboards should not depend on an LLM to function.

That separation makes the system easier to test, easier to operate at low cost, and easier to constrain when working with security-sensitive data.

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

## What I have learned so far

The most important lessons have been architectural rather than model-specific.

### Memory needs ownership

Shared skills are convenient. Shared memory is risky.

Every profile should have a clear owner for its memory, and that ownership should be visible in the filesystem and service configuration. If two profiles can silently write to the same memory files, isolation is only an assumption.

### Deterministic work should remain deterministic

If a shell script, database query, or scheduled check can do the job reliably, there is no reason to place an LLM in the middle of it.

Agents are most useful where interpretation, planning, synthesis, or judgment is actually required.

### Routing rules should be explicit

A small routing policy is easier to understand and debug than a second model trying to decide which model should handle every request.

### Baselines reduce noise

Monitoring everything all the time creates too much output. Comparing current state with a known baseline makes changes easier to notice and easier to review.

### Isolation is also a productivity feature

Separate profiles are not only about security. They also make the system easier to reason about. A project agent can stay focused on project context, while a general agent remains clean and reusable.

## Managing model lanes and usage

Running a self-hosted agent system is also an exercise in managing model usage. A capable model is useful, but sending every task to the most expensive or heavily limited lane is neither efficient nor necessary.

I route work according to the task rather than treating model choice as a fixed identity:

```text
deterministic task ───────► local script or tool
routine reasoning ────────► fast general model
delegated implementation ─► efficient coding model
specialist analysis ──────► domain-focused lane
high-impact reasoning ────► stronger model with review
```

The practical constraints are cost, token budgets, provider rate limits, context size, and cache behavior. A route that looks cheap per request can become expensive when it repeatedly resends the same context or exhausts a weekly allowance. I therefore pay attention to both the visible cost of a call and the operational cost of the lane around it.

Cache efficiency matters as much as raw model speed. Stable instructions, reusable skill context, and predictable prompt prefixes make repeated work cheaper and faster. Avoiding unnecessary rewrites of that stable context also helps preserve cache hits.

Fallbacks are part of the design rather than an emergency afterthought. A fallback lane should be tested for availability, capability, and limits instead of being selected only because it is technically reachable. The goal is graceful degradation: use a simpler local tool where possible, move to a cheaper lane for routine work, and reserve stronger models for tasks that justify the additional cost and scrutiny.

This turns model management into an engineering problem involving budgets, token accounting, cache-aware prompt design, rate-limit monitoring, and explicit routing rules.

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

## What comes next

The setup is still evolving. The next priorities are improving its security, reliability, and maintainability:

```text
├── make model fallbacks more resilient
├── keep the architecture documentation aligned with the actual system
├── improve health checks for gateways and model lanes
├── add better observability for scheduled jobs
└── continue documenting the system without exposing sensitive details
```

The goal is not to build the most complicated agent stack possible. It is to build a small system that is useful every day, inexpensive to keep running, carefully isolated, and simple enough to troubleshoot when something breaks.

What interests me most is not only using agents, but designing and securing the environment around them.
