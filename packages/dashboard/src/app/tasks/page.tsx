import { api, type Task } from '@/lib/api';
import { Badge, statusVariant } from '@/components/badge';
import { Card } from '@/components/card';
import { TaskCompleteButton } from './task-complete-button';

function TaskRow({ task }: { task: Task }) {
  const due = new Date(task.due_date);
  const overdue = due < new Date() && task.status === 'pending';
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={overdue ? 'border-red-200' : ''}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge label={task.priority} variant={task.priority === 'critical' ? 'emergency' : 'default'} />
            <Badge label={task.status} variant={statusVariant(task.status)} />
            {overdue && <Badge label="OVERDUE" variant="emergency" />}
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
          <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{task.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">
            {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
          </span>
          {task.status === 'pending' && (
            <TaskCompleteButton task_id={task.task_id} />
          )}
        </div>
      </div>
    </Card>
  );
}

export default async function TasksPage() {
  let tasks: Task[] = [];
  try {
    tasks = await api.tasks.list();
  } catch {
    // API not running
  }

  const humanTasks = tasks.filter((t) => t.type === 'human');
  const pending = humanTasks.filter((t) => t.status === 'pending');
  const done = humanTasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Human Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tasks that only you can complete — legal filings, registrations, bank accounts.
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h2>
          <div className="grid gap-3">
            {pending
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.priority as keyof typeof order] ?? 3) - (order[b.priority as keyof typeof order] ?? 3);
              })
              .map((t) => <TaskRow key={t.task_id} task={t} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Completed ({done.length})
          </h2>
          <div className="grid gap-3">
            {done.map((t) => <TaskRow key={t.task_id} task={t} />)}
          </div>
        </section>
      )}

      {humanTasks.length === 0 && (
        <p className="text-sm text-slate-400">No human tasks yet.</p>
      )}
    </div>
  );
}
