import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITask extends Document {
  task_id: string;
  type: 'agent' | 'human' | 'hybrid';
  parent_goal_id: string;
  title: string;
  description: string;
  owner_agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date: Date;
  blocked_by: string[];
  completion: {
    completed_at: Date | null;
    completed_by: string;
    evidence: Array<{
      type: 'document' | 'url' | 'text';
      title: string;
      reference: string;
      notes: string;
    }>;
  };
  created_by: string;
  created_at: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    task_id: { type: String, default: uuidv4, unique: true, index: true },
    type: { type: String, enum: ['agent', 'human', 'hybrid'], required: true },
    parent_goal_id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    owner_agent: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    due_date: { type: Date, required: true },
    blocked_by: [{ type: String }],
    completion: {
      completed_at: { type: Date, default: null },
      completed_by: { type: String, default: '' },
      evidence: [
        {
          type: { type: String, enum: ['document', 'url', 'text'] },
          title: String,
          reference: String,
          notes: String,
        },
      ],
    },
    created_by: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'tasks', timestamps: false },
);

TaskSchema.index({ owner_agent: 1, status: 1 });
TaskSchema.index({ parent_goal_id: 1 });

export const Task = model<ITask>('Task', TaskSchema);
