# Anima — AI Company Operating System

## Identity

Anima is an open source harness framework — the OS for AI agents.
Tagline: **You sign. AI runs everything.**

**Human proxy:** Usman (legal signatory, approval authority, 4–6 hrs/week)
**Reference implementation:** Hembuddy — onboarded as a CLIENT through the dashboard, not built as a codebase
**Framework GitHub:** anima-os/anima (v0.1 published after Phase 0)

---

## CRITICAL: What we build vs what Anima builds

**Developers build:** Anima (the generic OS). Zero business-specific code in the framework.
**Anima builds:** Hembuddy. Strategy Agent conducts the onboarding interview, creates the goal tree, and agents execute. Hembuddy's SEO keywords, provider vetting rules, and content strategy all come from the World Model — not from the codebase.

The `implementations/anima/` folder is the Anima platform itself (Fastify API, BullMQ workers, deployment config). Hembuddy is onboarded through the dashboard at runtime — it has no codebase directory.

---

## Core Doctrines (non-negotiable)

1. **World Model first** — every agent reads from and writes to the World Model before and after every action
2. **Goal-driven, not task-driven** — agents pursue measurable outcomes, not task lists
3. **Minimal human proxy** — 4–6 hrs/week target; every escalation must be worth the human's time
4. **Document every decision** — every agent action logged with reasoning to agent_decisions (the framework writes itself)
5. **Never stop** — session persistence, crash recovery, replay method; the company never freezes

---

## Database: MongoDB Atlas

**NOT PostgreSQL. MongoDB only.**

13 collections — see @docs/world-model-schema.md for full schemas:

| Collection | Purpose |
|---|---|
| goals | Goal tree: strategic, outcome, milestone |
| tasks | Agent and human tasks with evidence |
| agent_decisions | Append-only decision log — NEVER deleted |
| agent_sessions | Session state for crash recovery |
| providers | Partner profiles with competency scores |
| capabilities | Platform capabilities per service/geography |
| customers | Customer profiles |
| jobs | All jobs with financial attribution |
| company_wiki | Permanent company knowledge base |
| documents | RAG store — uploaded files and reports |
| escalations | Pending human proxy approvals |
| quality_alerts | Quality Agent threshold breach alerts |
| quality_config | Per-agent threshold configuration |

---

## MCP Transport

**Production (Railway):** `ANIMA_TRANSPORT=http` — agents run as persistent HTTP/SSE servers
**Development (Claude Code / VS Code):** `ANIMA_TRANSPORT=stdio` — agents use stdin/stdout
**Switch:** single env var. Each agent exports `startServer(transport)`.

This matters for BullMQ: workers send HTTP POST requests to persistent agent servers in production. In local dev, Claude Code spawns agents via stdio automatically.

---

## Five Agents

See @docs/agent-specs.md for full behavioral contracts.

| Agent | Role | Wake-up trigger |
|---|---|---|
| Strategy Agent | Supervisor harness. Reads goals, dispatches missions, runs onboarding intake, generates weekly brief | Configurable interval (default 30 min, user-adjustable) |
| Growth Agent | SEO, content, social, leads. All targets from company_wiki — none hardcoded | Strategy dispatch + weekly schedule |
| Operations Agent | Partner management, job assignment, quality scoring. All vetting rules from company_wiki | Event-driven + Strategy dispatch |
| Finance Agent | Cost tracking (Phase 0), invoicing + RUT (Phase 1). No transactions without a completed job | Event-driven (job.completed) + weekly |
| Quality Agent | Read-only monitor. Threshold checks. Reports to Strategy, escalates critical to human proxy directly | Always running + post-mission check |

**Build order:** Growth Agent first → Strategy Agent → Operations Agent → Quality Agent → Finance Agent → Full Harness

---

## Agent Lifecycle (6 states)

Bootstrapping → Active ↔ Idle → Hibernated → (resume to Idle)
Active/Idle → Exported (portable JSON artifact)
Active/Idle → Shutdown (cleanly terminated)

Quality Agent monitors Active and Idle states against quality_config thresholds.

---

## Memory Architecture (4 layers)

1. **Company Wiki** (company_wiki collection) — permanent structured facts, written by Strategy Agent during onboarding
2. **RAG Document Store** (documents collection) — uploaded files, contracts, task evidence, vectorized
3. **Agent Session Memory** — in-process context during while loop, compacted at 80–90% token budget
4. **Decision Log** (agent_decisions collection) — append-only, permanent, the long-term agent memory

---

## Goal Types

- **Strategic** — qualitative umbrella, no metric, approved by human proxy
- **Outcome** — measurable (current_value vs target_value), has at-risk detection
- **Milestone** — binary done/not done, Quality Agent verifies completion

At-risk formula: `at_risk = progress_pct < expected_progress_pct × (1 − threshold_pct/100)`
No goal is active without `governance.approved_at` set by human proxy.

---

## Task System

- **Agent task** — executed by agent, logged via post-hook
- **Human task** — completed by human proxy in dashboard with uploaded evidence
- **Hybrid task** — agent prepares, human executes (draft contract, human signs)

Human tasks for Hembuddy include: domain registration, Bolagsverket registration, bank account, Stripe setup, service partner agreements. These are generated by Strategy Agent during onboarding — not hardcoded.

---

## quality_config Schema

One document per agent in the quality_config collection:

```typescript
{
  agent: 'growth' | 'operations' | 'finance' | 'strategy' | 'quality',
  thresholds: {
    max_tokens_per_session: number,       // default 80000
    max_cost_per_day_sek: number,         // default 150
    max_idle_hours: number,               // default 48
    min_decisions_per_week: number,       // default 5
    max_failed_sessions_consecutive: number, // default 3
    unusual_decision_detection: boolean,  // default true
    cost_total_monthly_sek: number,       // default 2000
  },
  alerts: {
    token_overrun: 'warning' | 'critical' | 'emergency',
    cost_overrun: 'warning' | 'critical' | 'emergency',
    agent_idle: 'warning' | 'critical' | 'emergency',
    agent_failing: 'warning' | 'critical' | 'emergency',
    unusual_decision: 'warning' | 'critical' | 'emergency',
    monthly_budget_breach: 'warning' | 'critical' | 'emergency',
  },
  notification_channel: 'dashboard' | 'email' | 'both'
}
```

---

## Prompt Assembly Order (prefix cache — mandatory)

1. `anima/CLAUDE.md` — global baseline (STATIC, always first)
2. Implementation context (if any)
3. `agents/[name]/AGENTS.md` — agent-specific guides
4. World Model data context — (DYNAMIC, always last)

Violating this order destroys the prefix cache and multiplies token cost on every loop iteration.

---

## Harness: While Loop

Every agent mission runs a while loop:
1. Read World Model (build context)
2. Assemble prompt (mandatory order above)
3. Call Claude API → model selects action
4. Pre-hook: permission check, sensor validation, escalation if denied
5. Execute tool/skill
6. Post-hook: append agent_decisions (atomic flush), update World Model, emit SSE, fire BullMQ event if cross-agent
7. Check terminal state (goal met or iteration cap)
8. Iterate or end session

Iteration cap: 20 default, configurable in AGENTS.md. Session state checkpointed for replay on crash.

---

## Human Proxy Protocol

See @docs/human-proxy-protocol.md for full decision matrix.

**AI autonomous always:** publish content, assign jobs, send invoices (Finance pre-hook validates), routine communications
**Human required always:** financial commitment >SEK 5,000, legal filings, new service/geography, hires, provider termination, goal approval

---

## Development Standards

- Language: TypeScript (Node.js 20+) throughout
- Database: MongoDB with Mongoose (writeConcern majority on all writes)
- API: Fastify + @fastify/swagger (OpenAPI spec)
- Queue: BullMQ + Redis (ioredis)
- LLM: claude-sonnet-4-6 via Anthropic SDK (never hardcode model, use ANIMA_MODEL env var)
- Dashboard: Next.js 14 + shadcn/ui
- Monorepo: pnpm workspaces + Turborepo
- Agent prompts: in agents/[name]/AGENTS.md — never inline in code
- Decision log: append-only, immediate flush, writeConcern majority, never update or delete

---

## Repository Layout

```
anima/
├── CLAUDE.md                     ← you are here
├── ARCHITECTURE.md
├── README.md
├── docs/
│   ├── agent-specs.md
│   ├── world-model-schema.md
│   ├── human-proxy-protocol.md
│   └── phase0-playbook.md
├── packages/
│   ├── @anima/core               ← World Model client, harness, decision logger
│   ├── @anima/agents             ← 5 domain agents as MCP servers
│   ├── @anima/dashboard          ← Human proxy Next.js dashboard
│   └── @anima/cli                ← npx create-anima-app
└── implementations/
    └── anima/                    ← Anima platform (Fastify API, BullMQ, deployment)
```

Hembuddy is NOT a folder. It is onboarded as a client through the dashboard.

---

## First Claude Code Session

```
Initialize the Anima monorepo based on CLAUDE.md. Create pnpm workspace with 
packages: @anima/core, @anima/agents, @anima/dashboard, @anima/cli. Create 
implementations/anima for the platform API. Set up Turborepo. TypeScript throughout.
Note: implementations/anima not implementations/hembuddy — Hembuddy is onboarded 
as a client at runtime, it has no codebase directory.
```
