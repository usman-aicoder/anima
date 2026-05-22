import { api } from '@/lib/api';
import { Badge, statusVariant } from '@/components/badge';
import { Card, CardHeader } from '@/components/card';

export default async function OverviewPage() {
  const [goals, escalations, alerts, decisions] = await Promise.allSettled([
    api.goals.list(),
    api.escalations.list(),
    api.qualityAlerts.list(),
    api.agentDecisions.recent(10),
  ]);

  const goalList = goals.status === 'fulfilled' ? goals.value : [];
  const escalationList = escalations.status === 'fulfilled' ? escalations.value : [];
  const alertList = alerts.status === 'fulfilled' ? alerts.value : [];
  const decisionList = decisions.status === 'fulfilled' ? decisions.value : [];

  const pendingEscalations = escalationList.filter((e) => e.status === 'pending');
  const unresolvedAlerts = alertList.filter((a) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity !== 'warning');
  const atRiskGoals = goalList.filter((g) => g.status === 'at_risk');
  const draftGoals = goalList.filter((g) => g.status === 'draft');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Human proxy dashboard — things that need your attention</p>
      </div>

      {/* Attention summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending escalations', value: pendingEscalations.length, alert: pendingEscalations.length > 0 },
          { label: 'Goals awaiting approval', value: draftGoals.length, alert: draftGoals.length > 0 },
          { label: 'Critical alerts', value: criticalAlerts.length, alert: criticalAlerts.length > 0 },
          { label: 'Goals at risk', value: atRiskGoals.length, alert: atRiskGoals.length > 0 },
        ].map((stat) => (
          <Card key={stat.label} className={stat.alert ? 'border-amber-300' : ''}>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active goals */}
        <Card>
          <CardHeader title="Active Goals" subtitle={`${goalList.filter(g => g.status === 'active').length} active`} />
          <div className="space-y-3">
            {goalList.filter((g) => g.status === 'active').slice(0, 5).map((goal) => (
              <div key={goal.goal_id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{goal.title}</p>
                  <p className="text-xs text-slate-500">{goal.owner_agent} · {goal.progress.pct}%</p>
                </div>
                <div className="w-24 flex-shrink-0">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${goal.progress.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {goalList.filter((g) => g.status === 'active').length === 0 && (
              <p className="text-sm text-slate-400">No active goals.</p>
            )}
          </div>
        </Card>

        {/* Recent agent decisions */}
        <Card>
          <CardHeader title="Recent Decisions" subtitle="Last 10 agent actions" />
          <div className="space-y-2">
            {decisionList.map((d) => (
              <div key={d.decision_id} className="text-sm">
                <span className="font-medium text-slate-700">[{d.agent}]</span>{' '}
                <span className="text-slate-600">{d.decision_type}:</span>{' '}
                <span className="text-slate-500">{d.decision.slice(0, 80)}</span>
              </div>
            ))}
            {decisionList.length === 0 && (
              <p className="text-sm text-slate-400">No decisions yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Pending escalations preview */}
      {pendingEscalations.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader title="Pending Escalations" subtitle="These need your decision" />
          <div className="space-y-3">
            {pendingEscalations.slice(0, 3).map((e) => (
              <div key={e.escalation_id} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{e.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{e.recommended_action}</p>
                </div>
                <Badge label={e.agent} variant="default" />
              </div>
            ))}
            {pendingEscalations.length > 3 && (
              <p className="text-xs text-slate-400">+{pendingEscalations.length - 3} more — see Escalations page</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
