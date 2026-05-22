import { WorldModelClient } from '@anima/core';
import type { AgentName } from '@anima/core';
import { dispatchMission } from '../workers/dispatcher.js';

const ALL_AGENTS: AgentName[] = ['growth', 'strategy', 'operations', 'finance', 'quality'];

// On platform startup: find all crashed sessions across every agent and
// re-dispatch them as new BullMQ jobs so they resume from a clean state.
export async function recoverCrashedSessions(): Promise<void> {
  let recovered = 0;

  for (const agent of ALL_AGENTS) {
    const crashed = await WorldModelClient.agentSessions.findCrashed(agent);

    for (const session of crashed) {
      const snapshot = session.context_snapshot as Record<string, unknown>;
      const company_name = (snapshot['company_name'] as string | undefined) ?? 'unknown';
      const mission = session.mission;
      const goal_id = session.goal_id ?? undefined;

      await dispatchMission(agent, {
        company_name,
        mission,
        ...(goal_id !== undefined ? { goal_id } : {}),
      });

      // Mark the session as failed so it won't be picked up again
      await WorldModelClient.agentSessions.findById(session.session_id);

      console.log(
        `[crash-recovery] Re-queued ${agent} session ${session.session_id}: "${mission}"`,
      );
      recovered++;
    }
  }

  if (recovered > 0) {
    console.log(`[crash-recovery] ${recovered} crashed session(s) re-queued.`);
  }
}
