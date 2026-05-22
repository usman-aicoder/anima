import { Goal, type IGoal } from './db/models/goal.model.js';

export class GoalReader {
  // Only approved, active goals are visible to agents
  findActive(owner_agent?: IGoal['owner_agent']): Promise<IGoal[]> {
    const filter: Record<string, unknown> = {
      status: 'active',
      'governance.approved_at': { $ne: null },
    };
    if (owner_agent) filter['owner_agent'] = owner_agent;
    return Goal.find(filter).sort({ priority: 1 }).lean<IGoal[]>().exec();
  }

  findById(goal_id: string): Promise<IGoal | null> {
    return Goal.findOne({ goal_id, 'governance.approved_at': { $ne: null } })
      .lean<IGoal>()
      .exec();
  }

  findAtRisk(): Promise<IGoal[]> {
    return Goal.find({ status: 'at_risk', 'governance.approved_at': { $ne: null } })
      .lean<IGoal[]>()
      .exec();
  }

  // Returns true if actual progress is lagging behind expected progress
  isAtRisk(goal: IGoal): boolean {
    const now = Date.now();
    const start = goal.timeline.start_date.getTime();
    const deadline = goal.timeline.deadline.getTime();
    const elapsed = now - start;
    const total = deadline - start;
    if (total <= 0) return false;
    const expected_progress_pct = (elapsed / total) * 100;
    const threshold = goal.escalation_threshold_pct;
    return goal.progress.pct < expected_progress_pct * (1 - threshold / 100);
  }
}
