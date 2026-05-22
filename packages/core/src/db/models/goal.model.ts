import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IGoal extends Document {
  goal_id: string;
  type: 'strategic' | 'outcome' | 'milestone';
  parent_goal_id: string | null;
  title: string;
  objective: string;
  owner_agent: 'growth' | 'operations' | 'finance' | 'strategy' | 'human_proxy';
  metric: {
    name: string;
    unit: string;
    current_value: number;
    target_value: number;
    baseline_value: number;
  };
  progress: {
    pct: number;
    history: Array<{ value: number; measured_at: Date }>;
  };
  timeline: {
    start_date: Date;
    deadline: Date;
    achieved_at: Date | null;
  };
  status: 'draft' | 'active' | 'at_risk' | 'achieved' | 'paused' | 'escalated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  escalation_threshold_pct: number;
  completion_criteria: string | null;
  governance: {
    created_by: string;
    approved_by: string;
    approved_at: Date | null;
    created_at: Date;
  };
}

const GoalSchema = new Schema<IGoal>(
  {
    goal_id: { type: String, default: uuidv4, unique: true, index: true },
    type: { type: String, enum: ['strategic', 'outcome', 'milestone'], required: true },
    parent_goal_id: { type: String, default: null },
    title: { type: String, required: true },
    objective: { type: String, required: true },
    owner_agent: {
      type: String,
      enum: ['growth', 'operations', 'finance', 'strategy', 'human_proxy'],
      required: true,
    },
    metric: {
      name: { type: String, default: '' },
      unit: { type: String, default: '' },
      current_value: { type: Number, default: 0 },
      target_value: { type: Number, default: 0 },
      baseline_value: { type: Number, default: 0 },
    },
    progress: {
      pct: { type: Number, default: 0 },
      history: [{ value: Number, measured_at: Date }],
    },
    timeline: {
      start_date: { type: Date, required: true },
      deadline: { type: Date, required: true },
      achieved_at: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'at_risk', 'achieved', 'paused', 'escalated'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    escalation_threshold_pct: { type: Number, default: 30 },
    completion_criteria: { type: String, default: null },
    governance: {
      created_by: { type: String, required: true },
      approved_by: { type: String, default: 'human_proxy' },
      approved_at: { type: Date, default: null },
      created_at: { type: Date, default: Date.now },
    },
  },
  { collection: 'goals', timestamps: false },
);

GoalSchema.index({ owner_agent: 1, status: 1, 'governance.approved_at': 1 });
GoalSchema.index({ parent_goal_id: 1 });

export const Goal = model<IGoal>('Goal', GoalSchema);
