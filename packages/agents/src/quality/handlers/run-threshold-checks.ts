import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient } from '@anima/core';
import type { AgentName, AlertType, AlertSeverity } from '@anima/core';

interface CheckResult {
  agent: AgentName;
  check: string;
  threshold: number;
  actual: number;
  breached: boolean;
  severity: AlertSeverity;
  alert_id?: string;
}

const AGENTS: AgentName[] = ['growth', 'operations', 'finance', 'strategy', 'quality'];

async function createAlert(
  agent: AgentName,
  alert_type: AlertType,
  severity: AlertSeverity,
  threshold: number,
  actual: number,
  message: string,
): Promise<string> {
  const alert = await WorldModelClient.qualityAlerts.create({
    alert_id: uuidv4(),
    agent,
    alert_type,
    severity,
    threshold_value: threshold,
    actual_value: actual,
    message,
    resolved: false,
    resolved_at: null,
    created_at: new Date(),
  });
  return alert.alert_id;
}

export async function runThresholdChecks(_company_name: string): Promise<string> {
  const results: CheckResult[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const agent of AGENTS) {
    const config = await WorldModelClient.qualityConfig.findByAgent(agent);
    if (!config) continue;

    const t = config.thresholds;

    // 1. Check idle hours — find most recent session
    const sessions = await WorldModelClient.agentSessions.findCrashed(agent);
    const allSessions = await WorldModelClient.agentDecisions.findRecent(agent, 1);
    const lastDecisionAt = allSessions[0]?.created_at;
    const idleHours = lastDecisionAt
      ? (now.getTime() - new Date(lastDecisionAt).getTime()) / (1000 * 60 * 60)
      : t.max_idle_hours + 1; // treat no decisions as max idle

    const idleBreached = idleHours > t.max_idle_hours;
    const idleSeverity: AlertSeverity = config.alerts.agent_idle;
    let idleAlertId: string | undefined;
    if (idleBreached) {
      idleAlertId = await createAlert(
        agent, 'agent_idle', idleSeverity, t.max_idle_hours, idleHours,
        `${agent} agent idle for ${idleHours.toFixed(1)} hours (threshold: ${t.max_idle_hours}h)`,
      );
    }
    results.push({
      agent, check: 'idle_hours', threshold: t.max_idle_hours,
      actual: parseFloat(idleHours.toFixed(1)), breached: idleBreached,
      severity: idleSeverity, ...(idleAlertId ? { alert_id: idleAlertId } : {}),
    });

    // 2. Check consecutive failed sessions
    const failedCount = sessions.filter((s) => s.status === 'failed' || s.status === 'crashed').length;
    const failBreached = failedCount >= t.max_failed_sessions_consecutive;
    const failSeverity: AlertSeverity = config.alerts.agent_failing;
    let failAlertId: string | undefined;
    if (failBreached) {
      failAlertId = await createAlert(
        agent, 'agent_failing', failSeverity, t.max_failed_sessions_consecutive, failedCount,
        `${agent} agent has ${failedCount} consecutive failed/crashed sessions (threshold: ${t.max_failed_sessions_consecutive})`,
      );
    }
    results.push({
      agent, check: 'consecutive_failures', threshold: t.max_failed_sessions_consecutive,
      actual: failedCount, breached: failBreached,
      severity: failSeverity, ...(failAlertId ? { alert_id: failAlertId } : {}),
    });

    // 3. Check decisions per week
    const weeklyDecisions = await WorldModelClient.agentDecisions.findRecent(agent, 100);
    const decisionsThisWeek = weeklyDecisions.filter(
      (d) => new Date(d.created_at).getTime() > oneWeekAgo.getTime(),
    ).length;
    const decisionsBreached = decisionsThisWeek < t.min_decisions_per_week;
    let decisionAlertId: string | undefined;
    if (decisionsBreached) {
      decisionAlertId = await createAlert(
        agent, 'agent_idle', 'warning', t.min_decisions_per_week, decisionsThisWeek,
        `${agent} agent only made ${decisionsThisWeek} decisions this week (minimum: ${t.min_decisions_per_week})`,
      );
    }
    results.push({
      agent, check: 'decisions_per_week', threshold: t.min_decisions_per_week,
      actual: decisionsThisWeek, breached: decisionsBreached,
      severity: 'warning', ...(decisionAlertId ? { alert_id: decisionAlertId } : {}),
    });

    // 4. Check daily cost
    const dailyDecisions = weeklyDecisions.filter(
      (d) => new Date(d.created_at).getTime() > oneDayAgo.getTime(),
    );
    const dailyCost = dailyDecisions.reduce((sum, d) => sum + (d.token_usage?.cost_sek ?? 0), 0);
    const costBreached = dailyCost > t.max_cost_per_day_sek;
    const costSeverity: AlertSeverity = config.alerts.cost_overrun;
    let costAlertId: string | undefined;
    if (costBreached) {
      costAlertId = await createAlert(
        agent, 'cost_overrun', costSeverity, t.max_cost_per_day_sek, dailyCost,
        `${agent} agent spent ${dailyCost.toFixed(2)} SEK today (threshold: ${t.max_cost_per_day_sek} SEK)`,
      );
    }
    results.push({
      agent, check: 'daily_cost_sek', threshold: t.max_cost_per_day_sek,
      actual: parseFloat(dailyCost.toFixed(2)), breached: costBreached,
      severity: costSeverity, ...(costAlertId ? { alert_id: costAlertId } : {}),
    });

    // 5. Check monthly cost
    const monthlyDecisions = await WorldModelClient.agentDecisions.findRecent(agent, 500);
    const monthlyCost = monthlyDecisions
      .filter((d) => new Date(d.created_at).getTime() > oneMonthAgo.getTime())
      .reduce((sum, d) => sum + (d.token_usage?.cost_sek ?? 0), 0);
    const monthlyBreached = monthlyCost > t.cost_total_monthly_sek;
    const monthlySeverity: AlertSeverity = config.alerts.monthly_budget_breach;
    let monthlyAlertId: string | undefined;
    if (monthlyBreached) {
      monthlyAlertId = await createAlert(
        agent, 'monthly_budget_breach', monthlySeverity, t.cost_total_monthly_sek, monthlyCost,
        `${agent} agent monthly cost ${monthlyCost.toFixed(2)} SEK exceeds budget ${t.cost_total_monthly_sek} SEK`,
      );
    }
    results.push({
      agent, check: 'monthly_cost_sek', threshold: t.cost_total_monthly_sek,
      actual: parseFloat(monthlyCost.toFixed(2)), breached: monthlyBreached,
      severity: monthlySeverity, ...(monthlyAlertId ? { alert_id: monthlyAlertId } : {}),
    });

    void sessions; // used for crash detection above
  }

  const breaches = results.filter((r) => r.breached);
  return JSON.stringify({
    checked_agents: AGENTS.length,
    total_checks: results.length,
    breaches_found: breaches.length,
    alerts_created: breaches.filter((r) => r.alert_id).length,
    details: results,
  }, null, 2);
}
