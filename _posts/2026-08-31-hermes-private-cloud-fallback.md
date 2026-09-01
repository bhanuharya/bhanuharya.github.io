---
layout: post
title: "When the Homelab Goes Offline: Hermes Through Private Cloud Fallbacks"
date: 2026-08-31
author: bhanuharya
tags: [agents, networking, self-hosting, reliability, security]
---

The first article described why I run Hermes on a small Linux homelab and how its local profiles, tools, and gateways are separated.

This article is about a different problem: what remains useful when the homelab loses power, loses Internet access, or needs to be taken offline for maintenance.

The answer is not to copy the entire system onto every cloud VM. That would create more state to synchronize, more credentials to protect, and more opportunities for two gateways to believe they own the same messaging identity.

Instead, I split the problem into two layers:

```text
network availability  ──► independent cloud nodes and Tailscale
agent state            ──► the home gateway and controlled backups
```

The network layer is active today. The Hermes gateway layer remains deliberately conservative and is treated as an active/passive recovery problem rather than an automatic active/active cluster.

## The change

The homelab remains the main Hermes environment. Two small cloud VMs provide independent network paths and exit-node choices.

They are useful even when Hermes is not running on them:

- a trusted device can still reach an independent node;
- scripts can run from a different egress location;
- the ThinkPad can use a cloud exit node when a task needs a different network path;
- recovery access does not depend on the home router being available;
- a future Hermes standby can be added without changing the network design.

This is a narrower and more honest definition of failover than saying that the whole agent system is replicated.

## The topology

The current topology has one local working environment and two independent Tailscale exit nodes. The client chooses the exit node in the Tailscale application.

<figure class="diagram-wrap">
<svg class="architecture-diagram" style="display:block;width:100%;height:auto" preserveAspectRatio="xMidYMid meet" viewBox="0 0 900 500" role="img" aria-labelledby="failover-topology-title failover-topology-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="failover-topology-title">Hermes private cloud fallback topology</title>
  <desc id="failover-topology-desc">Trusted devices connect through Tailscale to a home Hermes host and two independent cloud exit nodes. The cloud nodes provide network and execution fallback, while Hermes gateway state remains primarily at home.</desc>
  <defs>
    <marker id="failover-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#777" />
    </marker>
    <style>
      .failover-box { fill:#0b0b0b; stroke:#bdbdbd; stroke-width:1.5; rx:5; }
      .failover-main { fill:#151515; stroke:#f0f0f0; stroke-width:1.5; rx:5; }
      .failover-fallback { fill:#101010; stroke:#c9a227; stroke-width:1.5; rx:5; }
      .failover-text { fill:#f0f0f0; font:16px monospace; text-anchor:middle; }
      .failover-muted { fill:#999; font:12px monospace; text-anchor:middle; }
      .failover-line { stroke:#777; stroke-width:1.5; fill:none; marker-end:url(#failover-arrow); }
      .failover-dashed { stroke:#777; stroke-width:1.5; fill:none; stroke-dasharray:7 6; marker-end:url(#failover-arrow); }
    </style>
  </defs>

  <rect class="failover-main" x="300" y="20" width="300" height="70" />
  <text class="failover-text" x="450" y="50">trusted devices</text>
  <text class="failover-muted" x="450" y="72">ThinkPad · phone · tablet</text>

  <rect class="failover-box" x="300" y="145" width="300" height="70" />
  <text class="failover-text" x="450" y="175">Tailscale private overlay</text>
  <text class="failover-muted" x="450" y="197">approved identities and routes</text>

  <line class="failover-line" x1="450" y1="90" x2="450" y2="145" />

  <rect class="failover-main" x="35" y="300" width="250" height="80" />
  <text class="failover-text" x="160" y="332">home Hermes host</text>
  <text class="failover-muted" x="160" y="354">primary gateway and state</text>

  <rect class="failover-fallback" x="325" y="300" width="250" height="80" />
  <text class="failover-text" x="450" y="332">primary cloud exit</text>
  <text class="failover-muted" x="450" y="354">independent egress</text>

  <rect class="failover-fallback" x="615" y="300" width="250" height="80" />
  <text class="failover-text" x="740" y="332">secondary cloud exit</text>
  <text class="failover-muted" x="740" y="354">fallback egress</text>

  <line class="failover-dashed" x1="450" y1="215" x2="160" y2="300" />
  <line class="failover-line" x1="450" y1="215" x2="450" y2="300" />
  <line class="failover-line" x1="450" y1="215" x2="740" y2="300" />

  <rect class="failover-box" x="190" y="430" width="520" height="45" />
  <text class="failover-muted" x="450" y="458">network failover is separate from Hermes state failover</text>
  <line class="failover-dashed" x1="160" y1="380" x2="290" y2="430" />
  <line class="failover-dashed" x1="450" y1="380" x2="450" y2="430" />
  <line class="failover-dashed" x1="740" y1="380" x2="610" y2="430" />
</svg>
</figure>

The dashed connection to the home host is intentional. It represents the primary working environment, not a promise that the cloud nodes can take over its state automatically.

## Why Tailscale became the client path

The first version used a conventional WireGuard endpoint. That gave the phone and laptop a direct full-tunnel path, but it also required a public UDP listener and separate client profile distribution.

The operational path is now Tailscale-first:

```text
Tailscale app
      │
      ├── primary cloud exit node for normal use
      ├── secondary cloud exit node during a network failure
      └── no exit node for ordinary local traffic
```

The client does not need to know how the cloud node reaches the Internet. It only needs an approved tailnet identity and an exit-node selection.

The primary and secondary exit nodes have been tested by changing the client selection and checking ordinary outbound traffic. A Tailscale control-plane ping alone is not enough; the useful test is whether a normal request exits with the expected location.

Relay behavior is also part of the design. Public cloud firewall rules for the direct transport path are disabled, and the nodes carry a host-level rule intended to reject direct transport packets. This makes the relay path the expected fallback even when a previous connection or NAT mapping might otherwise remain alive.

Relay traffic is not free of trade-offs. It adds latency and can reduce throughput. That is acceptable for administration, messaging, and bounded scripts. It would be a poor choice for moving large datasets or pretending that a low-cost fallback is a high-bandwidth private backbone.

## The firewall posture

Each cloud VM uses a separate virtual network. The ingress policy is deliberately small:

| Path | Policy | Reason |
|---|---|---|
| Identity-aware SSH tunnel | Allowed from the provider's IAP range | Recovery and administration without public SSH access |
| Direct WireGuard listener | Disabled | Retired after the Tailscale migration |
| Direct Tailscale UDP listener | Disabled at the VPC layer | Prefer relay transport |
| General inbound traffic | Denied by default | No public agent or proxy surface |
| Outbound traffic | Allowed as required for updates and egress | The nodes need to reach package and model endpoints |

The cloud VPC does not become safe merely because it has a small rule list. The guest still needs its own service checks, and the rule set needs to be inspected from the cloud control plane.

A guest cannot reliably answer the question “what effective VPC firewall policy applies to me?” without being given additional cloud API permissions. I prefer keeping the VM without a broad service account and checking the VPC rules externally.

That separation is useful:

```text
cloud control plane ──► verify VPC firewall policy
cloud guest          ──► verify services, routes, and local firewall
Tailscale client     ──► verify identity and data path
```

The public addresses remain attached for outbound Internet access and stable node identity. An address being present does not mean that a service is exposed; the ingress policy and the process listeners still determine the reachable surface.

## What is installed on the fallback nodes

The fallback nodes intentionally have a short software inventory:

| Component | Purpose |
|---|---|
| Minimal Linux image | Small, replaceable guest operating system |
| Tailscale daemon | Private node access and exit-node routing |
| Systemd | Daemon lifecycle and recurring health checks |
| IP forwarding and host firewall rules | Required for exit-node behavior and relay preference |
| Cloud guest tools | Provider-managed access and instance integration |
| Small verification scripts | Check route, daemon state, egress, and listeners |

Hermes is not installed on these nodes yet. That is deliberate rather than an omission. A one-gigabyte shared-core VM is adequate for Tailscale and small scripts but is not a credible replacement for a workstation running a gateway, browser processes, MCP sidecars, and multiple active profiles.

The cloud layer is therefore useful before it becomes an agent layer.

## Sizing the agent fallback

The model context window and the host's memory are separate constraints.

A remote model may accept a large context, but Hermes still serializes prompts, stores sessions, runs tool adapters, manages subprocesses, and may start browsers or containers. Those local processes need memory even when the model inference happens elsewhere.

The home gateway currently uses several gigabytes at busy points. A one-gigabyte cloud VM can boot a minimal service, but it has no useful headroom for the same workload.

The practical choices are:

```text
small shared-core VM ──► Tailscale, health checks, light scripts
2 GB class VM         ──► minimal headless gateway or standby
4 GB class VM         ──► more credible Hermes failover target
8 GB class VM         ──► closer to the full homelab workload
```

A fallback should be sized for the work it is expected to perform, not for the marketing label attached to its CPU count.

## Hermes failover is not automatic yet

The network failover is simple: select another exit node.

The Hermes failover is different because the gateway owns mutable state and messaging connections. A second gateway needs a usable copy of configuration, sessions, memories, skills, credentials, and any required local data. It also needs clear ownership of the messaging token.

The safe model is active/passive:

```text
home gateway active
cloud gateway stopped or isolated
             │
             ▼
confirmed home outage
             │
             ▼
restore a recent backup
             │
             ▼
start exactly one standby gateway
```

Two gateways must not poll the same messaging bot simultaneously. That creates token contention and can produce confusing delivery behavior. A second bot avoids the contention but changes the user-facing chat, so it is not a seamless failover.

The current system does not claim to have automatic Hermes host failover. It has independent network paths and a design for active/passive recovery. That distinction is important in an incident: changing the exit node is not the same as restoring the agent.

## Recovery sequence

The recovery procedure is intentionally boring:

1. Confirm whether the problem is the home network, the home host, the Hermes gateway, or the model provider.
2. Keep the primary cloud exit node available for administration.
3. If the home host is unavailable, select the secondary exit node if the primary path is also affected.
4. Access the fallback host through Tailscale or the provider's identity-aware SSH path.
5. Restore the latest verified Hermes backup only if agent continuity is required.
6. Confirm that the home gateway is stopped or fenced before starting a standby gateway with the same messaging identity.
7. Test one inbound request and one outbound delivery before declaring recovery complete.
8. When the home host returns, stop the standby before restoring primary ownership.

The sequence separates diagnosis, network access, state restoration, and messaging ownership. Combining them into one automatic script would make a split-brain failure easier to create and harder to explain.

## Health checks

The fallback nodes run local checks for:

- Tailscale daemon state;
- tailnet authentication state;
- default route;
- IPv4 forwarding on exit nodes;
- outbound Internet reachability;
- expected listeners;
- host-level relay rules; and
- the public egress address, reported only to the local check output.

The cloud control plane is checked separately for:

- instance state;
- IP forwarding capability;
- attached address state;
- network and subnet membership;
- IAP SSH rule;
- direct UDP rule state; and
- unexpected additional ingress rules.

These checks do not prove that Hermes is healthy. They prove that the network and recovery substrate is in a state where a human can investigate the next layer.

A useful failure report should distinguish at least four conditions:

```text
node unreachable
      │
      ├── cloud instance stopped
      ├── Tailscale daemon stopped or unauthenticated
      ├── relay path unavailable
      └── node reachable but Hermes unhealthy
```

Collapsing these into “VPN down” loses the information needed to recover safely.

## Cost and capacity

The home host keeps the fixed infrastructure cost low, while the cloud nodes add a small always-on cost for independent network presence, storage, and public addresses. Internet egress is the variable that can dominate if the nodes are used as general-purpose VPNs rather than occasional administration or bounded script runners.

I do not treat a free-tier allocation as a reliability guarantee. Capacity can disappear, accounts can have different limits, and a free shape can be unavailable in one availability domain while another shape is offered.

The useful controls are operational:

| Risk | Control |
|---|---|
| Unexpected egress | Keep workloads bounded and inspect billing usage |
| Free-tier exhaustion | Use quota and budget alerts; do not assume “free” means unlimited |
| Tiny VM memory | Keep the node narrow or resize before promoting it to Hermes |
| Stale fallback state | Back up critical Hermes data and test restoration |
| Duplicate gateway ownership | Fence the old gateway before starting the standby |
| Provider capacity loss | Keep more than one recovery path |

A graph would imply a stable historical cost or traffic series that I do not yet have. For this system, a topology diagram and a failure-state checklist are more honest than a decorative cost chart.

## What is deliberately not automated

I am not automatically starting a second Telegram gateway when the home host misses a health check.

A network timeout does not prove that a machine is powered off. It could be a local router problem, a Tailscale control-plane problem, a temporary provider issue, or a service that is still running but unable to answer one check. Starting a second gateway on weak evidence risks duplicate message polling and state divergence.

Automatic recovery becomes more reasonable after adding a real fencing mechanism, a durable lease, tested backups, and a clear owner for the messaging token. Until then, a short human-confirmed handoff is safer than a clever watchdog.

## What I have learned

### Availability has layers

A reachable exit node is not a reachable agent. A reachable agent is not a healthy gateway. A healthy gateway is not proof that its state is current.

### Smaller fallback roles are easier to keep reliable

A small node that provides private access, egress, and recovery tooling can remain useful even when it cannot carry the full production-like workload.

### Public IPs and public services are different things

A VM can have an address for outbound connectivity while its ingress remains deny-by-default. Exposure is a property of the complete path: address, firewall, listener, authentication, and application behavior.

### The handoff is the hard part

Installing the standby is easy. Deciding when it may own the messaging channel, how much state is acceptable to lose, and how to return ownership without duplication is the real failover design.

## Follow-up work

```text
├── test an encrypted Hermes backup and restore cycle
├── choose a realistic memory size for a headless standby
├── document gateway fencing and ownership explicitly
├── add billing and capacity alerts outside the agent loop
└── keep the public article separate from private topology details
```

The result is not a high-availability cluster. It is a small homelab with independent network paths and a recovery plan that is still allowed to say “human review required.”

That is a better description of the system, and a better starting point for improving it.
