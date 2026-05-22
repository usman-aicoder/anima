import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAgentSession extends Document {
  session_id: string;
  agent: string;
  mission: string;
  goal_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'waiting_approval' | 'crashed';
  iteration_count: number;
  iteration_cap: number;
  context_snapshot: Record<string, unknown>;
  conversation_state: Record<string, unknown>;
  last_checkpoint_at: Date;
  started_at: Date;
  ended_at: Date | null;
}

const AgentSessionSchema = new Schema<IAgentSession>(
  {
    session_id: { type: String, default: uuidv4, unique: true, index: true },
    agent: { type: String, required: true },
    mission: { type: String, required: true },
    goal_id: { type: String, default: null },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'waiting_approval', 'crashed'],
      default: 'running',
    },
    iteration_count: { type: Number, default: 0 },
    iteration_cap: { type: Number, default: 20 },
    context_snapshot: { type: Schema.Types.Mixed, default: {} },
    conversation_state: { type: Schema.Types.Mixed, default: {} },
    last_checkpoint_at: { type: Date, default: Date.now },
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date, default: null },
  },
  { collection: 'agent_sessions', timestamps: false },
);

AgentSessionSchema.index({ agent: 1, status: 1 });

export const AgentSession = model<IAgentSession>('AgentSession', AgentSessionSchema);
