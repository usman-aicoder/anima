import { WorldModelClient } from '@anima/core';
import type { AgentName } from '@anima/core';
import { dispatchMission } from './dispatcher.js';

const AGENT_TASK_OWNER_MAP: Record<string, AgentName> = {
  growth: 'growth',
  operations: 'operations',
  finance: 'finance',
  strategy: 'strategy',
  quality: 'quality',
};

// Called after every agent run. Finds pending agent tasks written to the
// World Model and dispatches them as BullMQ jobs. This is the cross-agent
// coordination mechanism — agents communicate via the World Model, not
// directly to each other.
export async function processAgentTasks(company_name: string): Promise<void> {
  const pendingTasks = await WorldModelClient.tasks.find({
    type: 'agent',
    status: 'pending',
  });

  for (const task of pendingTasks) {
    const agentName = AGENT_TASK_OWNER_MAP[task.owner_agent];
    if (!agentName) continue;

    // Mark as in_progress before dispatching to prevent double-dispatch
    await WorldModelClient.tasks.updateStatus(task.task_id, 'in_progress');

    await dispatchMission(agentName, {
      company_name,
      mission: task.title,
      goal_id: task.parent_goal_id ?? undefined,
    });
  }
}
