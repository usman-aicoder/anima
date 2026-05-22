import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient, GoalReader } from '@anima/core';

interface GoalHealthResult {
  goal_id: string;
  title: string;
  progress_pct: number;
  expected_pct: number;
  at_risk: boolean;
  alert_id?: string;
}

export async function checkGoalHealth(_company_name: string): Promise<string> {
  const reader = new GoalReader();
  const goals = await reader.findActive();

  if (goals.length === 0) {
    return JSON.stringify({ message: 'No active goals found.', goals_checked: 0 });
  }

  const results: GoalHealthResult[] = [];

  for (const goal of goals) {
    const atRisk = reader.isAtRisk(goal);

    // Compute expected progress for reporting
    const now = Date.now();
    const start = new Date(goal.timeline.start_date).getTime();
    const deadline = new Date(goal.timeline.deadline).getTime();
    const total = deadline - start;
    const elapsed = now - start;
    const expectedPct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

    const result: GoalHealthResult = {
      goal_id: goal.goal_id,
      title: goal.title,
      progress_pct: goal.progress.pct,
      expected_pct: parseFloat(expectedPct.toFixed(1)),
      at_risk: atRisk,
    };

    if (atRisk) {
      const alert = await WorldModelClient.qualityAlerts.create({
        alert_id: uuidv4(),
        agent: 'quality',
        alert_type: 'unusual_decision',
        severity: 'warning',
        threshold_value: parseFloat(expectedPct.toFixed(1)),
        actual_value: goal.progress.pct,
        message: `Goal "${goal.title}" is at risk: ${goal.progress.pct}% complete vs ${expectedPct.toFixed(1)}% expected.`,
        resolved: false,
        resolved_at: null,
        created_at: new Date(),
      });
      result.alert_id = alert.alert_id;

      // Mark goal as at_risk in World Model
      await WorldModelClient.goals.updateProgress(
        goal.goal_id,
        goal.metric.current_value,
        goal.progress.pct,
      );
    }

    results.push(result);
  }

  const atRiskCount = results.filter((r) => r.at_risk).length;
  return JSON.stringify({
    goals_checked: goals.length,
    at_risk_count: atRiskCount,
    alerts_created: atRiskCount,
    details: results,
  }, null, 2);
}
