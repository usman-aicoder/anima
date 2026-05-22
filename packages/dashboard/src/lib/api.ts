// All dashboard data fetching goes through this module.
// The Fastify API runs at NEXT_PUBLIC_API_URL (default: http://localhost:3000).

const BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Types (mirrors World Model schemas) ─────────────────────────────────────

export interface Goal {
  goal_id: string;
  type: 'strategic' | 'outcome' | 'milestone';
  parent_goal_id: string | null;
  title: string;
  objective: string;
  owner_agent: string;
  metric: { name: string; unit: string; current_value: number; target_value: number };
  progress: { pct: number };
  timeline: { start_date: string; deadline: string; achieved_at: string | null };
  status: string;
  priority: string;
  governance: { approved_by: string; approved_at: string | null; created_by: string };
}

export interface Task {
  task_id: string;
  type: 'agent' | 'human' | 'hybrid';
  title: string;
  description: string;
  owner_agent: string;
  status: string;
  priority: string;
  due_date: string;
  completion: { completed_at: string | null; completed_by: string };
}

export interface Escalation {
  escalation_id: string;
  agent: string;
  type: string;
  title: string;
  context: Record<string, unknown>;
  recommended_action: string;
  status: string;
  decided_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface QualityAlert {
  alert_id: string;
  agent: string;
  alert_type: string;
  severity: 'warning' | 'critical' | 'emergency';
  threshold_value: number;
  actual_value: number;
  message: string;
  resolved: boolean;
  created_at: string;
}

export interface AgentDecision {
  decision_id: string;
  agent: string;
  decision_type: string;
  decision: string;
  reasoning: string;
  created_at: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  goals: {
    list: () => apiFetch<Goal[]>('/goals'),
    approve: (goal_id: string) =>
      apiFetch<Goal>(`/goals/${goal_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ approved_by: 'human_proxy' }),
      }),
  },

  tasks: {
    list: () => apiFetch<Task[]>('/tasks'),
    listHuman: () => apiFetch<Task[]>('/tasks?type=human&status=pending'),
    complete: (task_id: string) =>
      apiFetch<Task>(`/tasks/${task_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', completed_by: 'human_proxy' }),
      }),
  },

  escalations: {
    list: () => apiFetch<Escalation[]>('/escalations'),
    decide: (escalation_id: string, decision: 'approved' | 'rejected', reason: string) =>
      apiFetch<Escalation>(`/escalations/${escalation_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, decision_by: 'human_proxy', decision_reason: reason }),
      }),
  },

  qualityAlerts: {
    list: () => apiFetch<QualityAlert[]>('/quality-alerts'),
    resolve: (alert_id: string) =>
      apiFetch<QualityAlert>(`/quality-alerts/${alert_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: true }),
      }),
  },

  agentDecisions: {
    recent: (limit = 20) => apiFetch<AgentDecision[]>(`/agent-decisions?limit=${limit}`),
  },
};
