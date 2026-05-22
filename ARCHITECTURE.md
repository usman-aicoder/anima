# Anima Architecture

The complete framework specification.

---

## What the framework installs

Four things, in this order:

1. **A World Model** — structured, queryable, append-only organizational intelligence across four layers: people/skills, capabilities, client relationships, financial performance.
2. **Domain agents** — AI systems with formal behavioral contracts (inputs, outputs, autonomous decisions, escalations) operating on and feeding the World Model.
3. **A human proxy protocol** — a precise decision matrix defining exactly what the AI owns and what the human must approve. This boundary is the most important design decision.
4. **A decision log** — every agent decision is logged with its reasoning, not just its output. This is how the framework documents itself as it runs.

---

## Core doctrines

### The World Model Imperative
Every organization has a World Model. The question is whether it is explicit (structured, queryable, machine-readable) or implicit (scattered across individual memories, email threads, tribal knowledge).

An implicit World Model taxes the organization with: onboarding delays, departure cliffs, scoping errors, signal loss, and coordination overhead. An explicit World Model compounds intelligence with every operation — each transaction, interaction, and outcome makes the model more accurate and therefore more valuable.

Anima installs an explicit World Model as the operating foundation, not as an IT project.

### The End of the Hierarchy
The organizational hierarchy was a communication technology — a system of human information routing built to compensate for the constraints of pre-digital organizations. Those constraints no longer exist.

When a structured World Model routes information more accurately and at lower latency than a management chain, the hierarchy is obsolete infrastructure. Anima replaces it with intelligence-driven coordination through the World Model.

### Capabilities, Not Features
Every agent is a formal Capability with defined inputs, measured outputs, cost profiles, and quality scores derived from real work — not self-reported. An agent doesn't "do marketing." It executes the Growth Capability with a documented performance history.

This distinction matters because capabilities compound. Each execution updates the cost profile, refines the quality score, and makes the next execution more accurate. Features are static. Capabilities improve.

---

## Agent coordination model

Agents do not coordinate with each other directly. They coordinate through the World Model.

```
World Model (shared state)
    ↑ reads                    ↓ writes
Growth Agent ←— (no direct comms) —→ Operations Agent
    ↑ reads                    ↓ writes
Finance Agent ←— (no direct comms) —→ Strategy Agent
```

This is deliberate. Direct agent-to-agent communication creates dependencies that are hard to audit and harder to debug. The World Model is the single source of truth. If the Growth Agent needs to know what service categories are highest margin, it queries the World Model — it does not ask the Finance Agent.

**Implementation pattern:**
1. Agent reads relevant World Model data at session start
2. Agent executes its decision logic
3. Agent writes outputs back to World Model
4. Agent logs the decision in `agent_decisions` with full reasoning
5. If escalation needed, agent creates escalation draft and awaits human input

---

## Human proxy layer

The human proxy is not a manager. They are an authorized signatory and escalation endpoint.

The design target: **4–6 hours per week** to oversee one Anima-operated company. At scale (5–6 companies running simultaneously), this expands proportionally — but the goal is always measured in hours, not a full-time role.

The human proxy:
- Approves decisions above the autonomous threshold (see human-proxy-protocol.md)
- Signs legal documents, authorizes bank transactions
- Handles relationship moments AI cannot — key provider calls, customer disputes requiring empathy
- Reviews the weekly strategy brief (30 min, produced automatically)
- Maintains the decision log for any human-made decisions

---

## Decision log as framework documentation

The `agent_decisions` table is the Anima framework's self-documentation mechanism.

Every decision logged with reasoning is:
- A record of what the AI did and why
- A training signal for improving agent prompts
- A framework artifact that other implementers can learn from
- Evidence of the system working as designed

When Hembuddy publishes Anima v0.1, the published framework documentation is derived directly from the decision log. Patterns that recur across hundreds of decisions become documented protocols. Edge cases that required escalation become documented thresholds. The framework is not written separately from the operation — it is extracted from it.

**This is the architectural reason the decision log must be maintained with discipline from day one.**

---

## Scalability model

A single Anima installation serves one company. To run multiple companies simultaneously:

- Each company gets its own World Model instance (own database schema or separate database)
- Each company gets its own agent configuration (different prompts, different thresholds, different escalation rules)
- The human proxy handles escalation queues from all companies in a single batched review session
- The Strategy Agent across all companies feeds a portfolio-level signal to the human proxy

Target at full scale: one human proxy running 5–6 Anima-operated companies with 4–6 hours/week per company, batched efficiently.

---

## What Anima is not

- **Not an AI assistant.** Anima does not answer questions or help with tasks. It runs the company.
- **Not an automation tool.** Automation executes predefined rules. Anima makes decisions based on a world model.
- **Not a CRM or ERP.** The World Model is the organizational intelligence layer, not a software category.
- **Not a product to sell.** Anima is a framework. The product is the company it operates (e.g. Hembuddy). Anima is the blueprint.
- **Not complete without a human proxy.** The framework is designed for human+AI collaboration at the boundary of legal, financial, and trust requirements.
