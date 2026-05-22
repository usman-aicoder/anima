import Anthropic from '@anthropic-ai/sdk';
import { WorldModelClient } from '@anima/core';
import type { GoalDraft, GoalTreeInput } from './types.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

interface GoalTreeResponse {
  strategic_goal: { title: string; objective: string };
  one_month_goals: GoalDraft[];
  three_month_goals: GoalDraft[];
  milestone_goals: GoalDraft[];
}

async function callGoalTreeAPI(input: GoalTreeInput): Promise<GoalTreeResponse> {
  const prompt = `You are creating a goal tree for a business. Based on the context below, create an appropriate, measurable goal tree.

Business context:
- Company: ${input.company_name}
- Business type: ${input.business_type}
- Market: ${input.market}
- Primary challenge: ${input.primary_challenge}
- Monthly budget: ${input.monthly_budget}
- Success in 1 month: ${input.success_1m}
- Success in 3 months: ${input.success_3m}

Return a JSON object with exactly this structure:
{
  "strategic_goal": {
    "title": "One-sentence strategic direction",
    "objective": "Why this goal matters for this business (1-2 sentences)"
  },
  "one_month_goals": [
    {
      "type": "outcome",
      "title": "Specific measurable goal",
      "objective": "Why this matters",
      "metric_name": "exact_field_to_track",
      "metric_unit": "unit (visitors, GBP, jobs, signups, etc.)",
      "target_value": 100,
      "deadline_months": 1,
      "priority": "high"
    }
  ],
  "three_month_goals": [ ...same structure, deadline_months: 3 ],
  "milestone_goals": [
    {
      "type": "milestone",
      "title": "Binary milestone",
      "objective": "Why this milestone gates progress",
      "metric_name": "",
      "metric_unit": "",
      "target_value": 1,
      "deadline_months": 1,
      "priority": "critical",
      "completion_criteria": "Specific criteria for marking this done"
    }
  ]
}

Rules:
- Choose metrics appropriate for THIS business type. Do not default to generic "traffic" metrics for non-web businesses.
- 1-month goals: 2-3 outcomes achievable in 30 days given the budget and challenge.
- 3-month goals: 2-3 outcomes that represent real traction.
- Milestones: 3-5 binary gates (website live, first partner onboarded, first sale, etc.)
- All target_value must be realistic given the budget and market stage.
- Return only the JSON object. No explanation.`;

  const response = await client.messages.create({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No response from goal tree API');

  const raw = text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(raw) as GoalTreeResponse;
}

export async function buildGoalTree(
  input: GoalTreeInput,
): Promise<{ goals_created: number; goal_ids: string[] }> {
  const tree = await callGoalTreeAPI(input);
  const goal_ids: string[] = [];
  const now = new Date();

  // Strategic goal
  const strategic = await WorldModelClient.goals.create({
    type: 'strategic',
    title: tree.strategic_goal.title,
    objective: tree.strategic_goal.objective,
    owner_agent: 'strategy',
    metric: { name: '', unit: '', current_value: 0, target_value: 0, baseline_value: 0 },
    progress: { pct: 0, history: [] },
    timeline: {
      start_date: now,
      deadline: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      achieved_at: null,
    },
    status: 'draft',
    priority: 'critical',
    escalation_threshold_pct: 30,
    completion_criteria: null,
    governance: { created_by: 'strategy-agent', approved_by: '', approved_at: null, created_at: now },
  });
  goal_ids.push(strategic.goal_id);

  // Outcome and milestone goals
  const allGoals = [
    ...tree.one_month_goals,
    ...tree.three_month_goals,
    ...tree.milestone_goals,
  ];

  const agentMap: Record<string, 'growth' | 'operations' | 'finance' | 'strategy'> = {
    visitors: 'growth', traffic: 'growth', organic: 'growth', content: 'growth',
    providers: 'operations', partners: 'operations', jobs: 'operations',
    revenue: 'finance', cost: 'finance', budget: 'finance', mrr: 'finance',
  };

  for (const g of allGoals) {
    const deadlineDate = new Date(now.getTime() + g.deadline_months * 30 * 24 * 60 * 60 * 1000);
    const ownerKey = Object.keys(agentMap).find((k) =>
      g.metric_name.toLowerCase().includes(k) || g.title.toLowerCase().includes(k),
    );
    const owner = ownerKey ? agentMap[ownerKey]! : 'strategy';

    const created = await WorldModelClient.goals.create({
      type: g.type,
      parent_goal_id: strategic.goal_id,
      title: g.title,
      objective: g.objective,
      owner_agent: owner,
      metric: {
        name: g.metric_name,
        unit: g.metric_unit,
        current_value: 0,
        target_value: g.target_value,
        baseline_value: 0,
      },
      progress: { pct: 0, history: [] },
      timeline: { start_date: now, deadline: deadlineDate, achieved_at: null },
      status: 'draft',
      priority: g.priority,
      escalation_threshold_pct: 30,
      completion_criteria: g.completion_criteria ?? null,
      governance: {
        created_by: 'strategy-agent',
        approved_by: '',
        approved_at: null,
        created_at: now,
      },
    });
    goal_ids.push(created.goal_id);
  }

  return { goals_created: goal_ids.length, goal_ids };
}
