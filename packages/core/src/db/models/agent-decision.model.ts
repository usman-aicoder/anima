import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AgentName = 'growth' | 'operations' | 'finance' | 'strategy' | 'quality';

export interface IAgentDecision extends Document {
  decision_id: string;
  session_id: string;
  agent: AgentName;
  decision_type: string;
  input_signal: string;
  decision: string;
  reasoning: string;
  output: string;
  world_model_update: Record<string, unknown>;
  escalated_to_human: boolean;
  human_decision: string | null;
  token_usage: {
    input_tokens: number;
    output_tokens: number;
    cost_sek: number;
  };
  created_at: Date;
}

const AgentDecisionSchema = new Schema<IAgentDecision>(
  {
    decision_id: { type: String, default: uuidv4, unique: true, index: true },
    session_id: { type: String, required: true },
    agent: {
      type: String,
      enum: ['growth', 'operations', 'finance', 'strategy', 'quality'],
      required: true,
    },
    decision_type: { type: String, required: true },
    input_signal: { type: String, required: true },
    decision: { type: String, required: true },
    reasoning: { type: String, required: true },
    output: { type: String, required: true },
    world_model_update: { type: Schema.Types.Mixed, default: {} },
    escalated_to_human: { type: Boolean, default: false },
    human_decision: { type: String, default: null },
    token_usage: {
      input_tokens: { type: Number, default: 0 },
      output_tokens: { type: Number, default: 0 },
      cost_sek: { type: Number, default: 0 },
    },
    created_at: { type: Date, default: Date.now, immutable: true },
  },
  { collection: 'agent_decisions', timestamps: false },
);

// Enforce append-only — no updates or deletes ever
const APPEND_ONLY_ERROR = 'agent_decisions is append-only. Updates and deletes are prohibited.';
AgentDecisionSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'],
  function () { throw new Error(APPEND_ONLY_ERROR); },
);
AgentDecisionSchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete'],
  function () { throw new Error(APPEND_ONLY_ERROR); },
);

AgentDecisionSchema.index({ agent: 1, created_at: -1 });
AgentDecisionSchema.index({ session_id: 1 });
AgentDecisionSchema.index({ decision_type: 1, created_at: -1 });

export const AgentDecision = model<IAgentDecision>('AgentDecision', AgentDecisionSchema);
