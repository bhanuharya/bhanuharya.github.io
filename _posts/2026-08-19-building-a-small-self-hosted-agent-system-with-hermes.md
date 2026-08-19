---
layout: post
title: "Building a Small Self-Hosted Agent System with Hermes"
date: 2026-08-19
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

```text
                         ┌──────────────────────┐
                         │      Chat clients    │
                         │   separate bot entry │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
        ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
        │  Profile A │         │  Profile B │         │  Profile C │
        │  general   │         │  project   │         │  isolated  │
        └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
              │                     │                     │
        ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
        │  Memory A  │         │  Memory B  │         │  Memory C  │
        └────────────┘         └────────────┘         └────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │       Shared capabilities      │
                    │ skills · tools · local services│
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │          Task routing          │
                    │ fast · cheap · specialist · deep│
                    └───────────────────────────────┘
```

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

Two public repositories are part of that tooling layer:

| Repository | Role |
|---|---|
| [secure-development-tools](https://github.com/bhanuharya/secure-development-tools) | Security-scan orchestration for source-code, application, secrets, and dependency checks, with findings collected into a single workflow. |
| [cti-radar](https://github.com/bhanuharya/cti-radar) | A self-hosted CTI and attack-surface correlation dashboard for authorized findings, assets, vulnerabilities, and mitigation tracking. |

Conceptually, the relationship looks like this:

```text
                         ┌──────────────────┐
                         │      Hermes      │
                         │  agent control   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
       ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
       │ secure-dev  │     │  CTI Radar  │     │ local jobs  │
       │ tooling     │     │ correlation │     │ and scripts  │
       └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                         ┌────────▼────────┐
                         │ findings, logs, │
                         │ reports, alerts │
                         └─────────────────┘
```

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

## What comes next

The setup is still evolving. The next improvements are mostly about reliability and maintainability:

```text
├── make fallback model lanes more durable
├── keep architecture documentation synchronized with reality
├── improve health checks for gateways and model lanes
├── add better observability around scheduled jobs
└── document the system without publishing sensitive details
```

The main goal is not to build the most complicated agent stack possible. It is to build a small system that is useful every day, cheap enough to leave running, isolated enough to trust, and simple enough to understand when something breaks.

That is the part I find most interesting: not just using an agent, but designing the environment around it.
