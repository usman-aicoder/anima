# Agent Specifications

Behavioral contracts for Anima's four domain agents.
Each spec defines: what the agent owns, what it reads from the World Model, what it writes back, what it decides autonomously, and what it must escalate.

**Rule:** An agent that cannot be described by this spec format is not yet ready to be built.

---

## Growth Agent

**Purpose:** Drive organic traffic, generate leads, build brand presence, and surface demand signals.

**Build priority:** First. The Growth Agent validates the market before any other agent is needed.

### Inputs (reads from World Model)
- Keyword opportunity list (difficulty, intent, current ranking)
- Competitor content gaps
- Service category demand signals (which services are being searched)
- Geographic demand distribution
- Content performance history (what is driving traffic and conversions)

### Outputs (writes to World Model)
- Weekly keyword rank updates per tracked keyword
- Content pieces published (URL, keyword target, publish date)
- Traffic data (sessions, sources, landing pages) — updated weekly
- Lead events (form submissions, email captures) with source attribution
- Social engagement metrics per post
- A/B test results on messaging or CTAs

### Autonomous decisions (no human needed)
- Publish blog posts, guides, and service pages
- Update meta titles and descriptions based on rank data
- Schedule and publish social media content
- Adjust content calendar based on traffic signals
- Respond to routine social comments and DMs
- Update internal linking between pages
- Submit new URLs to Google Search Console

### Escalates to human proxy when
- Any paid advertising spend (Google Ads, Meta, any platform)
- Any external partnership announcement or co-branded content
- Any claim about pricing, guarantees, or legal rights
- Any press inquiry or media mention
- Brand voice changes or positioning pivots

### Decision log format
```json
{
  "agent": "growth",
  "decision_type": "content_publish",
  "timestamp": "2026-05-17T10:00:00Z",
  "input_signal": "keyword 'flyttstädning nyköping' at position 14, low competition",
  "decision": "publish service page targeting this keyword",
  "reasoning": "Low difficulty keyword with transactional intent and geographic match to launch city",
  "output": "/flyttstadning-nykoping published",
  "world_model_update": "keyword_rankings[flyttstädning nyköping] = {position: null, page: /flyttstadning-nykoping, published: 2026-05-17}"
}
```

---

## Operations Agent

**Purpose:** Coordinate job assignment, provider quality, customer communications, and service delivery.

**Build priority:** Second. Needed when the first real jobs flow through the platform.

### Inputs (reads from World Model)
- Active job requests with service type, location, date range
- Provider availability and geographic coverage
- Provider quality scores (derived from past job completions)
- Customer history and RUT eligibility status
- Open complaints and dispute status

### Outputs (writes to World Model)
- Job assignment events (which provider, which job, what time)
- Job completion events with quality flag
- Provider quality score updates after each job
- Customer satisfaction signals (rating, complaint flag)
- Response time data per provider

### Autonomous decisions (no human needed)
- Assign incoming jobs to eligible providers based on score, geography, availability
- Send booking confirmations to customers
- Send job briefings and reminders to providers
- Flag a provider for quality review after two below-threshold jobs
- Send routine follow-up messages post-job requesting rating
- Mark jobs complete and trigger invoice generation

### Escalates to human proxy when
- Customer complaint involves property damage
- Customer or provider requests compensation
- Provider termination decision (after quality threshold breach)
- Job cancellation less than 24 hours before scheduled time with disputed fee
- Any communication requiring a legal position or commitment

### Decision log format
```json
{
  "agent": "operations",
  "decision_type": "job_assignment",
  "timestamp": "2026-06-01T08:30:00Z",
  "input_signal": "job_id: J0042, service: hemstädning, location: Nyköping, date: 2026-06-05",
  "decision": "assign to provider P0018 (Städ AB Nyköping)",
  "reasoning": "Highest quality score (8.4/10) among available providers in Nyköping postal zone 61100–61199, confirmed availability",
  "output": "assignment confirmed, briefing sent to P0018, confirmation sent to customer C0031",
  "world_model_update": "jobs[J0042].assigned_provider = P0018, jobs[J0042].status = assigned"
}
```

---

## Finance Agent

**Purpose:** Generate invoices, process RUT deduction eligibility, track margins, and flag financial anomalies.

**Build priority:** Third. Needed when revenue starts flowing in Phase 1.

### Inputs (reads from World Model)
- Completed jobs with cost and service type data
- Customer RUT eligibility status and annual RUT deduction usage
- Provider payment rates and commission structure
- Platform fee schedule by service category
- Running margin data by service type and geography

### Outputs (writes to World Model)
- Invoice events (invoice ID, amount, RUT deduction applied, net customer payment)
- Payment received events
- Provider payment events
- Margin data per job, attributed to service type and geography
- RUT deduction totals per customer per calendar year
- Monthly P&L snapshot per service category

### Autonomous decisions (no human needed)
- Generate and send customer invoices after job completion
- Calculate and apply RUT deduction to eligible jobs
- Generate provider payment instructions (for human to authorize payment)
- Flag jobs where actual cost exceeded estimated cost by >20%
- Send payment reminders at 7 and 14 days overdue
- Update running margin dashboard after each job

### Escalates to human proxy when
- Any query received from Skatteverket (Swedish Tax Agency)
- Customer billing dispute above SEK 1,000
- Provider disputes their payment calculation
- Any unusual financial pattern (>3 chargebacks in a week, unusual refund pattern)
- Quarterly tax filing preparation (agent prepares, human reviews and submits)
- Any transaction requiring manual bank authorization

### RUT compliance rules (hard-coded)
- RUT deduction applies to labor cost only, not materials or transport
- Maximum annual deduction per person: SEK 75,000
- Customer must be over 18 and tax-liable in Sweden
- Work must be performed in or near the customer's home
- Agent must verify against current Skatteverket rules on every calculation — do not rely on cached rules

### Decision log format
```json
{
  "agent": "finance",
  "decision_type": "invoice_generate",
  "timestamp": "2026-06-06T09:00:00Z",
  "input_signal": "job_id: J0042 completed, gross_labor: 1200 SEK, customer: C0031, rut_eligible: true, rut_used_ytd: 8500 SEK",
  "decision": "apply 50% RUT deduction to labor cost",
  "reasoning": "Customer RUT-eligible, annual usage (8500) well below SEK 75,000 cap, service qualifies under hemstädning",
  "output": "invoice INV0091 generated: gross 1200, RUT -600, net customer payment 600 SEK",
  "world_model_update": "invoices[INV0091] = {...}, customers[C0031].rut_used_ytd = 9100"
}
```

---

## Strategy Agent

**Purpose:** Monitor the World Model for strategic signals, maintain priorities, and surface expansion opportunities.

**Build priority:** Fourth. Starts generating value once the other three agents have produced enough operational data.

### Inputs (reads from World Model)
- All agent decision logs (pattern detection)
- Traffic and lead data by geography and service category
- Margin data by service type and geography
- Provider pipeline depth by geography
- Competitor signals (new entrants, pricing changes, content gaps)
- Keyword opportunity data (new opportunities emerging)

### Outputs (writes to World Model)
- Strategic decision log entries with reasoning
- Service category priority scores (which to expand next)
- Geographic opportunity scores (which city to launch next)
- Provider acquisition targets (which geographies need more providers)
- Weekly strategy brief (structured summary for human proxy review)

### Autonomous decisions (no human needed)
- Update service category priority scores based on demand signals
- Generate provider acquisition briefs targeting high-opportunity geographies
- Flag underperforming service categories with diagnosis
- Draft expansion proposals for human proxy review (does not execute expansion)
- Adjust acceptance criteria for provider onboarding based on quality data

### Escalates to human proxy when
- Recommending launch in a new city (presents proposal, human decides)
- Recommending new service category (presents data case, human decides)
- Pricing change recommendation above 10% variance
- Any recommendation requiring legal entity changes
- Any partnership or acquisition opportunity

### Decision log format
```json
{
  "agent": "strategy",
  "decision_type": "expansion_signal",
  "timestamp": "2026-07-01T08:00:00Z",
  "input_signal": "3 unprompted provider inquiries from Stockholm in 2 weeks, 'städfirma stockholm' keyword at position 8 with rising trend",
  "decision": "flag Stockholm as Phase 1 expansion candidate",
  "reasoning": "Organic provider interest + rising search demand + existing keyword position indicates market pull without paid spend",
  "output": "expansion_proposal_stockholm.md drafted, flagged for Usman review",
  "world_model_update": "geographies[stockholm].expansion_priority = high, geographies[stockholm].signal_date = 2026-07-01"
}
```
