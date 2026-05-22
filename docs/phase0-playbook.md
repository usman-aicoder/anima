# Phase 0 Playbook — Generic Framework Validation

Phase 0 validates Anima as a generic operating system before v1.0 publication.
Hembuddy is the first client — onboarded through the dashboard, not built as a codebase.

---

## Phase 0 Exit Criteria (what makes Anima ready)

- All 5 agents run full while loops with pre/post hooks
- Strategy Agent completes onboarding intake for any business type in under 30 minutes
- Goal tree creation works for at least two different business types (home services + SaaS)
- Human proxy can approve goals and process escalations in dashboard
- Quality Agent monitors all agents against configurable thresholds
- Decision log has 100+ entries with reasoning (not just outputs)
- Agent export/import works (portable JSON artifact)
- `npx create-anima-app` bootstraps a new project in under 5 minutes

---

## Sprint Sequence

| Sprint | Focus | Key deliverable |
|---|---|---|
| 0 | Environment | Monorepo, MongoDB Atlas 13 collections, env vars |
| 1 | @anima/core | WorldModelClient, DecisionLogger, BaseAgent, SessionManager |
| 2 | Growth Agent (generic) | Reads keyword targets from company_wiki, not hardcoded |
| 3 | World Model API + Strategy Agent | Generic onboarding (any business), goal tree creation |
| 4 | Operations Agent (generic) | Vetting rules from company_wiki, not hardcoded |
| 5 | Quality Agent + Dashboard | Monitoring, escalation queue, goal progress UI |
| 6 | Full Harness | While loop, hooks, BullMQ, cross-agent events, compaction |
| 7 | Finance Agent | Cost tracking, burn rate (invoicing is Phase 1) |
| 8 | Anima v0.1 + Hembuddy pilot | Generic framework ships, then Hembuddy onboarded as first client |

---

## Hembuddy Onboarding (Phase B — after v0.1 ships)

Usman runs the standard Anima onboarding flow. No developer work required.

**Interview (10 questions):**
1. What is the business name and legal structure?
2. What product or service does the business sell?
3. Who is the target customer — describe in 2-3 sentences.
4. What geography or market are you targeting first?
5. What is the primary business challenge right now?
6. What does success look like in 1 month? In 3 months?
7. What is the approximate monthly operations budget?
8. What tools and platforms are you already using or have access to?
9. Are there regulatory, legal, or compliance constraints?
10. Who else (humans) will be involved?

**Documents to upload at onboarding:**
- Keyword research (29 keywords with intent, difficulty, title tags, meta descriptions)
- Competitor analysis (11 competitors with positioning and strategy data)
- Developer brief (confirmed website design and SEO decisions)
- Anima Design Document v1.0 (Swedish market context, RUT rules, brand guidelines)

**After approval:**
- Strategy Agent creates goal tree: 1,000 organic visitors, 15 providers, cost targets
- Human tasks generated: domain registration, developer website fixes, analytics setup
- Agent tasks: Growth Agent starts SEO strategy, Operations starts provider outreach
- All 5 agents activate. Hembuddy is running.

---

## Two-Scenario Test (Sprint exit criteria)

Every sprint must pass the two-scenario test before moving forward:

**Scenario A:** Run with Hembuddy inputs (Swedish home services marketplace)
**Scenario B:** Run with different inputs (UK SaaS tool, or Dubai restaurant)

**Assert:** Both produce different, appropriate outputs (goals, vetting rules, content strategy).
**Assert:** Zero code changes required between the two scenarios.
**Assert:** All differences come from company_wiki content, not from code.

This confirms Anima is genuinely generic and not a Hembuddy-specific tool disguised as a framework.

---

## Decision Log Discipline

Every week, every agent must log decisions with reasoning. The discipline:
- Not just WHAT the agent did
- WHY the agent decided it (what model or logic it used)
- WHAT data from the World Model informed the decision
- WHAT it expects to happen next

Three months of logged decisions = Anima v0.1 documentation.
Recurring patterns → documented protocols.
Escalation events → documented thresholds for human-proxy-protocol.md.
