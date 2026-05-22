import { api, type Goal } from '@/lib/api';
import { Badge, statusVariant } from '@/components/badge';
import { Card } from '@/components/card';
import { GoalApproveButton } from './goal-approve-button';

function GoalRow({ goal }: { goal: Goal }) {
  const deadlineDate = new Date(goal.timeline.deadline);
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={goal.type} variant="default" />
            <Badge label={goal.status} variant={statusVariant(goal.status)} />
            <Badge label={goal.priority} variant={goal.priority === 'critical' ? 'emergency' : 'default'} />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">{goal.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{goal.objective}</p>
        </div>
        {goal.status === 'draft' && <GoalApproveButton goal_id={goal.goal_id} />}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>Owner: <span className="font-medium text-slate-700">{goal.owner_agent}</span></span>
        {goal.metric.name && (
          <span>
            Target: <span className="font-medium text-slate-700">
              {goal.metric.target_value} {goal.metric.unit}
            </span>
          </span>
        )}
        <span>Deadline: <span className="font-medium text-slate-700">{daysLeft}d</span></span>
      </div>

      {goal.status !== 'draft' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${goal.progress.pct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 w-10 text-right">{goal.progress.pct}%</span>
        </div>
      )}
    </Card>
  );
}

export default async function GoalsPage() {
  let goals: Goal[] = [];
  try {
    goals = await api.goals.list();
  } catch {
    // API not running — show empty state
  }

  const drafts = goals.filter((g) => g.status === 'draft');
  const active = goals.filter((g) => g.status === 'active' || g.status === 'at_risk');
  const done = goals.filter((g) => g.status === 'achieved');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Goal Tree</h1>
        <p className="text-sm text-slate-500 mt-1">
          Draft goals need your approval before agents can pursue them.
        </p>
      </div>

      {drafts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Awaiting approval ({drafts.length})
          </h2>
          <div className="grid gap-3">
            {drafts.map((g) => <GoalRow key={g.goal_id} goal={g} />)}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Active ({active.length})
          </h2>
          <div className="grid gap-3">
            {active.map((g) => <GoalRow key={g.goal_id} goal={g} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Achieved ({done.length})
          </h2>
          <div className="grid gap-3">
            {done.map((g) => <GoalRow key={g.goal_id} goal={g} />)}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <p className="text-sm text-slate-400">No goals yet. Run the Strategy Agent onboarding to create the goal tree.</p>
      )}
    </div>
  );
}
