# Human Proxy Protocol

The decision matrix that defines the boundary between AI autonomy and human authority.

**Principle:** This document is the most important design artifact in the Anima framework. The quality of the AI-boss model is determined almost entirely by how well this boundary is drawn. Too much to the human = the human is doing operations, not proxying. Too little = the human is exposed to legal and financial risk they don't know about.

**Hembuddy human proxy:** Usman
**Weekly time budget:** 4–6 hours maximum across all Anima-operated companies
**Review cadence:** This document is reviewed and updated at the end of each operating month. It is a living protocol.

---

## Decision Authority Matrix

### AI Autonomous — no human input needed

| Decision | Agent | Notes |
|---|---|---|
| Publish blog post, guide, or service page | Growth | Within brand voice guidelines |
| Update meta title / description | Growth | Based on rank data |
| Schedule and publish social content | Growth | Within content calendar |
| Adjust content calendar based on signal | Growth | Within approved service categories |
| Respond to routine social comments | Growth | Exclude complaints, pricing questions, legal queries |
| Add new keyword to tracking | Growth | |
| Submit URLs to Google Search Console | Growth | |
| Update internal links between pages | Growth | |
| Assign incoming job to provider | Operations | Based on quality score + geography + availability |
| Send booking confirmation to customer | Operations | |
| Send job briefing and reminder to provider | Operations | |
| Send routine post-job follow-up | Operations | Rating request only |
| Flag provider for quality review | Operations | After 2 below-threshold jobs |
| Mark job complete | Operations | Triggers invoice generation |
| Generate and send invoice | Finance | After job completion event |
| Calculate and apply RUT deduction | Finance | Must verify against current Skatteverket rules |
| Generate provider payment instructions | Finance | Human authorizes actual bank transfer |
| Send payment reminder at day 7 and day 14 | Finance | Standard overdue reminders only |
| Update capability cost profiles | Finance | After each job |
| Update provider quality scores | Finance/Operations | After each rating event |
| Update keyword rank data | Growth | Weekly |
| Update geographic demand signals | Strategy | Based on incoming data |
| Draft expansion proposal for review | Strategy | Draft only — does not execute |
| Generate weekly strategy brief | Strategy | For human proxy review |

---

### Human Proxy Required — Usman must decide

| Decision | Threshold / Trigger | Why |
|---|---|---|
| Any paid advertising spend | Any amount | Ongoing financial commitment |
| Any financial commitment | Above SEK 5,000 | Material commitment threshold |
| Any legal filing | Always | Legal liability |
| Company registration (Bolagsverket) | Phase 1 trigger | Legal entity creation |
| Bank account opening | Phase 1 trigger | Financial infrastructure |
| New service category launch | Always | Strategic scope expansion |
| Geographic expansion to new city | Always | Operational scope expansion |
| Any hire | Always | Employment obligation |
| Provider termination | Always | Relationship / legal risk |
| Customer compensation | Above SEK 500 | Financial and relationship decision |
| Billing dispute resolution | Above SEK 500 | |
| Pricing change | Above 10% variance | Material market signal |
| Any tax authority communication | Always | Regulatory interaction |
| Quarterly tax filing | Always | Agent prepares, human submits |
| Partnership announcement | Always | Brand and legal implications |
| External press or media response | Always | Brand risk |
| Terms of service update | Always | Legal document |
| Privacy policy update | Always | GDPR compliance document |
| Any claim of guarantee or warranty | Always | Legal exposure |

---

## Escalation Protocol

When an agent encounters a decision requiring human input, it:

1. Logs the escalation event in `agent_decisions` with `escalated_to_human = true`
2. Creates a draft of the decision (recommended action with supporting data) in `escalation_drafts/`
3. Sends a notification to the human proxy (email or designated channel)
4. Waits — does not proceed until human decision is logged
5. After human decision: logs `human_decision` field in `agent_decisions`, executes if approved

**Escalation SLA:** Human proxy commits to responding to escalations within 24 hours on working days. Agents do not chase or follow up more than once in 24 hours.

---

## Time Budget Allocation (target per week)

| Activity | Time | Notes |
|---|---|---|
| Review weekly strategy brief | 30 min | Produced by Strategy Agent every Monday |
| Respond to escalations queue | 60–90 min | Batched, not real-time |
| Review and approve content before major campaigns | 30 min | Only for new formats or positioning |
| Review financial summary | 20 min | Produced by Finance Agent weekly |
| Provider or customer calls (if any) | 30 min | Relationship moments AI cannot replace |
| **Total** | **~3–3.5 hours** | Leaves buffer within 4–6 hour budget |

---

## Protocol Review Log

| Date | Change | Reason |
|---|---|---|
| 2026-05-17 | Initial protocol created | Framework inception — extracted from planning session |

*Add a row here whenever this protocol is updated. Every change is a World Model artifact.*
