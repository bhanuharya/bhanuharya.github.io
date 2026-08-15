# Home Server Agent Infrastructure — Security Posture, Accepted Risks & Roadmap

> **Public, sanitized version.** The internal document (OPSEC specifics: network identifiers, hostnames, account details) is kept private on the server.
> **Owner:** wishnu · **Last reviewed:** 2026-08-15

---

## 1. System overview

Three autonomous Telegram agents run as systemd user units on a home server (laptop-class hardware, Ubuntu 24.04 LTS):

| Agent | Role | Isolation |
|---|---|---|
| Main agent | primary assistant, admin-only pairing | full host access |
| Project agent | ops/research agent | shares memory+skills with main (by design); own sessions |
| Family agent | sandboxed personal bot | fully isolated memory |

**Self-hosted services (private overlay network only — zero public exposure):**

| Service | Port | Auth |
|---|---|---|
| CV explorer (FastAPI) | 8080 | private network |
| SDLC scanner orchestration | 8081 | HTTP Basic (credentials in service env, never in repos) |
| Daily market digest web app | 8083 | private network |
| SearXNG (metasearch) | 8082 | private network |
| crawl4ai (crawler, v0.9.2) | 11235 | Bearer token, localhost-only |
| Camofox (anti-detection browser) | 9377 | Bearer key, localhost-only |
| Tailscale serve (HTTPS) | 443 | private network → :8081 |

**Remote access paths:**
- **Phone** (Tailscale app): direct private-network access to all services
- **Work laptop** (corporate network, direct VPN blocked): cloud sandbox jump node → SSH tunnel → services
- **Private-network devices**: full access

---

## 2. Enforced security controls (verified audit)

- Firewall active; ingress restricted to the private overlay network range; **no public exposure ever enabled**
- Every listening port accounted for — **zero public endpoints**
- Remote-desktop tooling purged after audit (was listening on all interfaces); no other remote tools
- **Docker**: unix-socket only; all containers hardened — image digests pinned, `cap_drop ALL`, `no-new-privileges`, tmpfs `/tmp`, localhost-only binds, API tokens/keys required
- **GitHub**: private repos only, SSH-key auth, agent home never pushed
- **Telegram 2FA** enabled; bot tokens are Bot-API auth (independent of account 2FA)
- **Secrets**: `.env` files only — never in git, never pasted into chat; key-rotation script with backups and value-free verification
- **Web apps**: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, no server banner, API docs disabled
- **Ops**: watchdog every 2 minutes (all 3 agents), nightly encrypted-to-disk backup job, unattended security updates active, battery charge cap, no-login boot, agent skill directory 600-restricted
- **Scanning/OSINT**: disposable Docker containers only — never host-installed tooling
- **Data hygiene**: market-data pipeline uses official tier-1 sources (central bank, exchange, treasury), self-computed daily changes, sanity gate that suppresses outliers instead of publishing them; crawler output treated as untrusted data

---

## 3. Accepted risks (explicitly documented)

| # | Risk | Why accepted | Mitigation in place |
|---|---|---|---|
| 1 | **No full-disk encryption** — data at rest plaintext (incl. env secrets) | Requires reinstall (decision deferred) | Private-network-only ingress; physical access assumed compromised; rotation script ready |
| 2 | **Backups local + unencrypted + same disk** | Offsite backup parked by owner ("not yet") | Nightly snapshots exist; GitHub offsite for code |
| 3 | **Scanner platform runs as the server user** — a web RCE would expose agent home + env secrets | Containerization not yet done | HTTP Basic auth, private network, security headers, no public exposure |
| 4 | **Cross-agent injection chain**: web content → agent summary → shared memory → trusted context of the main agent | Shared memory is a deliberate single-user convenience | Origin-awareness in prompt rules; memory small and auditable; risk documented |
| 5 | **Project agent host terminal** | Deliberate case-by-case acceptance (productivity; sandbox declined) | Scanning/OSINT still containerized; containment-on-demand policy |
| 6 | **Browser engines on host** (Playwright + anti-detection Firefox fork) — real exploit surface | Needed for JS-rendered / bot-protected pages | Hardened containers: digest pins, cap-drop, no-new-privileges, localhost binds, API keys, no host mounts, residential-IP egress only |
| 7 | **Cloud jump node** — ephemeral cloud VM with baked-in VPN auth key | Work laptop can't run the VPN (corporate firewall) | Key-scoped node, private-network-only, rejoin runbook documented |
| 8 | **Tier-2 market data** (one vendor for non-domestic indices) | Official exchange endpoints for some markets pending | Labelled tier-2, self-computed changes + sanity gate, suppressed on outlier |
| 9 | **Chat platform not end-to-end encrypted** — bot traffic transits the platform's servers | Platform constraint (Bot API) | No secrets pasted in chat; admin pairing restricted; 2FA on account |
| 10 | **No dead-man's switch** — agents keep running indefinitely if owner incapacitated | Not implemented | Documented; family agent sandboxed; no destructive autonomous actions by policy |
| 11 | **No low-battery graceful shutdown** | Not implemented | Battery charge cap reduces wear; AC power normally present |
| 12 | **Zero public endpoints → no external monitoring** | Private-network-only is deliberate | Local watchdog + backups; jump-node path for remote check |

---

## 4. Operational notes

- Agent health is read from the gateway's own INFO-level logs — system journal filters at WARNING+ and caused a false-alarm goose chase early on
- Recovery after reboot: all user units and containers auto-start; VPN auto-connects
- Cloud jump node recycle: one rejoin script → verify online → one SSH tunnel (documented runbook)
- Key rotation: scripted with backups, placeholder guards, and value-free verification; one manual item (jump-node VPN key)

---

## 5. Future improvements (roadmap)

**Immediate (pending):**
- [ ] Execute key rotation (API keys, tokens, secrets — script ready)
- [ ] Secret-scan full history on repos
- [ ] Scanner-key rotation

**Hardening plan phases (parked by owner decision):**
- [ ] Offsite backup to cloud free tier (owner: "not yet")
- [ ] Scanner platform into Docker (removes risk #3)
- [ ] Full-disk encryption decision, low-battery graceful shutdown, dead-man's switch

**Product/engineering:**
- [ ] Market digest: two-column layout (domestic actionable / global context), domestic foreign-flow tier-1 data, official exchange endpoints for remaining markets
- [ ] Secret-scan as pre-push gate

---

*Living document — updated on any posture change (reviewed 2026-08-15). Internal full version kept privately.*
