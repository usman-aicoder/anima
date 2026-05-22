# World Model Schema — MongoDB Collections

Database: **MongoDB Atlas** (NOT PostgreSQL)
ODM: **Mongoose** with writeConcern: { w: 'majority' } on all writes
Decision log: **append-only** — no updates, no deletes, ever

---

## Collection 1: goals

```typescript
{
  goal_id: string,           // UUID, primary key
  type: 'strategic' | 'outcome' | 'milestone',
  parent_goal_id: string | null,
  title: string,
  objective: string,         // 1-2 sentence "why" — injected into agent context
  owner_agent: 'growth' | 'operations' | 'finance' | 'strategy' | 'human_proxy',
  metric: {
    name: string,            // exact World Model field to read current value from
    unit: string,
    current_value: number,
    target_value: number,
    baseline_value: number,
  },
  progress: {
    pct: number,             // 0-100, derived
    history: Array<{ value: number, measured_at: Date }>,  // last 90 entries
  },
  timeline: {
    start_date: Date,
    deadline: Date,
    achieved_at: Date | null,
  },
  status: 'draft' | 'active' | 'at_risk' | 'achieved' | 'paused' | 'escalated',
  priority: 'critical' | 'high' | 'medium' | 'low',
  escalation_threshold_pct: number,    // default 30
  completion_criteria: string | null,  // milestone type only
  governance: {
    created_by: string,
    approved_by: string,               // always human_proxy
    approved_at: Date | null,          // null = inactive draft
    created_at: Date,
  }
}
```

**Key rule:** No goal is active until `governance.approved_at` is set. Agents filter: `{ status: 'active', 'governance.approved_at': { $ne: null } }`

---

## Collection 2: tasks

```typescript
{
  task_id: string,
  type: 'agent' | 'human' | 'hybrid',
  parent_goal_id: string,
  title: string,             // verb + object, action-oriented
  description: string,       // full instructions including evidence requirements
  owner_agent: string,       // agent name or 'human_proxy'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled',
  priority: 'critical' | 'high' | 'medium' | 'low',
  due_date: Date,
  blocked_by: string[],      // task_ids that must complete first
  completion: {
    completed_at: Date | null,
    completed_by: string,
    evidence: Array<{
      type: 'document' | 'url' | 'text',
      title: string,
      reference: string,     // document_id, URL, or text
      notes: string,
    }>,
  },
  created_by: string,
  created_at: Date,
}
```

---

## Collection 3: agent_decisions (APPEND-ONLY — never update or delete)

```typescript
{
  decision_id: string,
  session_id: string,
  agent: 'growth' | 'operations' | 'finance' | 'strategy' | 'quality',
  decision_type: string,     // e.g. 'content_publish', 'job_assignment', 'invoice_generate'
  input_signal: string,      // what triggered this decision
  decision: string,          // what the agent decided
  reasoning: string,         // WHY — the model it used (this is the framework documentation)
  output: string,            // what was produced or actioned
  world_model_update: object, // which fields were updated as a result
  escalated_to_human: boolean,
  human_decision: string | null,  // null unless escalated
  token_usage: {
    input_tokens: number,
    output_tokens: number,
    cost_sek: number,
  },
  created_at: Date,           // immutable
}
```

**Indexes:** `{ agent: 1, created_at: -1 }`, `{ session_id: 1 }`, `{ decision_type: 1 }`
**No TTL index** — this collection is permanent.

---

## Collection 4: agent_sessions

```typescript
{
  session_id: string,
  agent: string,
  mission: string,
  goal_id: string | null,
  status: 'running' | 'completed' | 'failed' | 'waiting_approval' | 'crashed',
  iteration_count: number,
  iteration_cap: number,        // from AGENTS.md, default 20
  context_snapshot: object,     // World Model state at session start
  conversation_state: object,   // current while loop history (for replay)
  last_checkpoint_at: Date,
  started_at: Date,
  ended_at: Date | null,
}
```

---

## Collection 5: providers

```typescript
{
  provider_id: string,
  company_name: string,
  org_number: string,           // business registration number
  contact_name: string,
  contact_email: string,
  contact_phone: string,
  rut_certified: boolean,       // required for Hembuddy; general flag for other businesses
  verified_at: Date | null,
  active: boolean,
  status: 'interested' | 'vetted' | 'onboarded' | 'active' | 'suspended',
  competencies: Array<{         // embedded, updated per job completion
    service_type: string,
    quality_score: number,      // 0-10
    job_count: number,
    avg_response_time_hours: number,
    last_job_date: Date,
  }>,
  geographic_coverage: Array<{
    city: string,
    postal_prefix: string,
  }>,
  created_at: Date,
  deprecated_at: Date | null,
}
```

---

## Collection 6: capabilities

```typescript
{
  capability_id: string,
  service_type: string,
  geography: string,
  avg_cost: number,
  avg_completion_hours: number,
  quality_score_avg: number,
  provider_count: number,
  demand_signal: number,         // keyword search volume proxy
  job_count_30d: number,
  updated_at: Date,
}
```

---

## Collection 7: customers

```typescript
{
  customer_id: string,
  email: string,
  first_name: string,
  last_name: string,
  address: string,
  city: string,
  postal_code: string,
  rut_eligible: boolean,
  rut_used_ytd: number,
  rut_year: number,
  lifetime_value: number,
  last_interaction_at: Date,
  acquisition_source: string,
  created_at: Date,
}
```

---

## Collection 8: jobs

```typescript
{
  job_id: string,
  customer_id: string,
  provider_id: string | null,
  service_type: string,
  geography: string,
  scheduled_at: Date | null,
  completed_at: Date | null,
  status: 'requested' | 'assigned' | 'completed' | 'cancelled' | 'disputed',
  estimated_hours: number,
  actual_hours: number | null,
  labor_cost: number,
  platform_fee: number,
  rut_deduction: number,
  net_customer_payment: number,
  quality_rating: number | null,  // 1-5
  acquisition_source: string,
  created_at: Date,
}
```

---

## Collection 9: company_wiki

```typescript
{
  wiki_id: string,
  company_name: string,          // one document per company
  category: string,              // e.g. 'identity', 'market', 'services', 'customer', 'tech_stack'
  key: string,                   // e.g. 'seo_keywords', 'partner_requirements'
  value: any,                    // flexible — string, array, object
  version: number,               // incremented on update
  previous_value: any | null,    // last value for audit
  updated_by: string,
  updated_at: Date,
  created_at: Date,
}
```

**Key content types:**
- `seo_keywords`: Array<{ keyword, intent, priority, target_url }>
- `content_guidelines`: { tone, languages[], key_messages[], avoid[] }
- `tech_stack`: { cms_type, cms_api_endpoint, social_platforms[], analytics_platform }
- `partner_requirements`: { required_fields[], vetting_criteria[], onboarding_steps[] }
- `monthly_budget`: number (SEK or local currency)
- `strategy_agent_interval`: number (minutes, default 30)

---

## Collection 10: documents (RAG store)

```typescript
{
  document_id: string,
  title: string,
  type: 'uploaded' | 'generated' | 'task_evidence' | 'review' | 'brief',
  content_text: string,         // extracted text for RAG retrieval
  vector_embedding: number[],   // via MongoDB Atlas Vector Search
  tags: string[],
  linked_task_id: string | null,
  linked_goal_id: string | null,
  uploaded_by: string,
  created_at: Date,
}
```

---

## Collection 11: escalations

```typescript
{
  escalation_id: string,
  agent: string,
  type: string,                 // e.g. 'goal_tree_approval', 'budget_exceeded', 'partner_rejection'
  title: string,
  context: object,              // full data for human to make decision
  recommended_action: string,
  status: 'pending' | 'approved' | 'rejected' | 'expired',
  decision_by: string | null,
  decision_reason: string | null,
  decided_at: Date | null,
  created_at: Date,
  expires_at: Date | null,
}
```

---

## Collection 12: quality_alerts

```typescript
{
  alert_id: string,
  agent: string,
  alert_type: 'token_overrun' | 'cost_overrun' | 'agent_idle' | 'agent_failing' | 'unusual_decision' | 'monthly_budget_breach',
  severity: 'warning' | 'critical' | 'emergency',
  threshold_value: number,
  actual_value: number,
  message: string,
  resolved: boolean,
  resolved_at: Date | null,
  created_at: Date,
}
```

---

## Collection 13: quality_config

```typescript
{
  agent: 'growth' | 'operations' | 'finance' | 'strategy' | 'quality',
  thresholds: {
    max_tokens_per_session: number,           // default 80000
    max_cost_per_day_sek: number,             // default 150
    max_idle_hours: number,                   // default 48
    min_decisions_per_week: number,           // default 5
    max_failed_sessions_consecutive: number,  // default 3
    unusual_decision_detection: boolean,      // default true
    cost_total_monthly_sek: number,           // default 2000
  },
  alerts: {
    token_overrun: 'warning' | 'critical' | 'emergency',
    cost_overrun: 'warning' | 'critical' | 'emergency',
    agent_idle: 'warning' | 'critical' | 'emergency',
    agent_failing: 'warning' | 'critical' | 'emergency',
    unusual_decision: 'warning' | 'critical' | 'emergency',
    monthly_budget_breach: 'warning' | 'critical' | 'emergency',
  },
  notification_channel: 'dashboard' | 'email' | 'both',
  updated_at: Date,
}
```

---

## MongoDB Index Summary

```javascript
// goals
db.goals.createIndex({ owner_agent: 1, status: 1, 'governance.approved_at': 1 })
db.goals.createIndex({ parent_goal_id: 1 })

// agent_decisions (most queried collection)
db.agent_decisions.createIndex({ agent: 1, created_at: -1 })
db.agent_decisions.createIndex({ session_id: 1 })
db.agent_decisions.createIndex({ decision_type: 1, created_at: -1 })

// agent_sessions
db.agent_sessions.createIndex({ agent: 1, status: 1 })
db.agent_sessions.createIndex({ session_id: 1 }, { unique: true })

// escalations
db.escalations.createIndex({ status: 1, created_at: -1 })

// quality_alerts
db.quality_alerts.createIndex({ agent: 1, severity: 1, resolved: 1 })

// documents (Atlas Vector Search index configured separately)
db.documents.createIndex({ type: 1, created_at: -1 })
db.documents.createIndex({ linked_task_id: 1 })
```
