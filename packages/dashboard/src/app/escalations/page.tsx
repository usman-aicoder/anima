import { api, type Escalation } from '@/lib/api';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { EscalationDecideButtons } from './escalation-decide-buttons';

function EscalationRow({ escalation }: { escalation: Escalation }) {
  const created = new Date(escalation.created_at);
  const expires = escalation.expires_at ? new Date(escalation.expires_at) : null;
  const hoursLeft = expires
    ? Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60))
    : null;

  return (
    <Card className={escalation.status === 'pending' ? 'border-amber-200' : ''}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge label={escalation.agent} variant="default" />
            <Badge label={escalation.type} variant="default" />
            <Badge
              label={escalation.status}
              variant={escalation.status === 'pending' ? 'warning' : escalation.status === 'approved' ? 'success' : 'default'}
            />
            {hoursLeft !== null && hoursLeft < 12 && escalation.status === 'pending' && (
              <Badge label={`Expires in ${hoursLeft}h`} variant="emergency" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{escalation.title}</h3>
          <p className="text-xs text-slate-600 mt-1">
            <span className="font-medium">Recommended:</span> {escalation.recommended_action}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {created.toLocaleDateString()} {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {escalation.status === 'pending' && (
          <EscalationDecideButtons escalation_id={escalation.escalation_id} />
        )}
      </div>
    </Card>
  );
}

export default async function EscalationsPage() {
  let escalations: Escalation[] = [];
  try {
    escalations = await api.escalations.list();
  } catch {
    // API not running
  }

  const pending = escalations.filter((e) => e.status === 'pending');
  const decided = escalations.filter((e) => e.status !== 'pending');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Escalations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Decisions agents cannot make autonomously. Your response commits the company.
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Awaiting decision ({pending.length})
          </h2>
          <div className="grid gap-3">
            {pending.map((e) => <EscalationRow key={e.escalation_id} escalation={e} />)}
          </div>
        </section>
      )}

      {decided.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Resolved ({decided.length})
          </h2>
          <div className="grid gap-3">
            {decided.slice(0, 10).map((e) => <EscalationRow key={e.escalation_id} escalation={e} />)}
          </div>
        </section>
      )}

      {escalations.length === 0 && (
        <p className="text-sm text-slate-400">No escalations. Agents are operating autonomously.</p>
      )}
    </div>
  );
}
