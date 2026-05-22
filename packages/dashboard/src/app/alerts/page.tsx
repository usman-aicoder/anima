import { api, type QualityAlert } from '@/lib/api';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { AlertResolveButton } from './alert-resolve-button';

function AlertRow({ alert }: { alert: QualityAlert }) {
  const severityVariant = {
    warning: 'warning' as const,
    critical: 'critical' as const,
    emergency: 'emergency' as const,
  }[alert.severity];

  return (
    <Card className={alert.resolved ? 'opacity-60' : ''}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge label={alert.severity.toUpperCase()} variant={severityVariant} />
            <Badge label={alert.agent} variant="default" />
            <Badge label={alert.alert_type} variant="default" />
            {alert.resolved && <Badge label="resolved" variant="success" />}
          </div>
          <p className="text-sm text-slate-900">{alert.message}</p>
          <p className="text-xs text-slate-500 mt-1">
            Threshold: {alert.threshold_value} · Actual: {alert.actual_value.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(alert.created_at).toLocaleString()}
          </p>
        </div>
        {!alert.resolved && (
          <AlertResolveButton alert_id={alert.alert_id} />
        )}
      </div>
    </Card>
  );
}

export default async function AlertsPage() {
  let alerts: QualityAlert[] = [];
  try {
    alerts = await api.qualityAlerts.list();
  } catch {
    // API not running
  }

  const unresolved = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  const bySeverity = (a: QualityAlert) => ({ emergency: 0, critical: 1, warning: 2 })[a.severity] ?? 3;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quality Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Threshold breaches detected by the Quality Agent.
        </p>
      </div>

      {unresolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">
            Unresolved ({unresolved.length})
          </h2>
          <div className="grid gap-3">
            {unresolved
              .sort((a, b) => bySeverity(a) - bySeverity(b))
              .map((a) => <AlertRow key={a.alert_id} alert={a} />)}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Resolved ({resolved.length})
          </h2>
          <div className="grid gap-3">
            {resolved.slice(0, 10).map((a) => <AlertRow key={a.alert_id} alert={a} />)}
          </div>
        </section>
      )}

      {alerts.length === 0 && (
        <p className="text-sm text-slate-400">No quality alerts. All agents within thresholds.</p>
      )}
    </div>
  );
}
