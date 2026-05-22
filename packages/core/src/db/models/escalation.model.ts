import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IEscalation extends Document {
  escalation_id: string;
  agent: string;
  type: string;
  title: string;
  context: Record<string, unknown>;
  recommended_action: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decision_by: string | null;
  decision_reason: string | null;
  decided_at: Date | null;
  created_at: Date;
  expires_at: Date | null;
}

const EscalationSchema = new Schema<IEscalation>(
  {
    escalation_id: { type: String, default: uuidv4, unique: true, index: true },
    agent: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    context: { type: Schema.Types.Mixed, default: {} },
    recommended_action: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    decision_by: { type: String, default: null },
    decision_reason: { type: String, default: null },
    decided_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date, default: null },
  },
  { collection: 'escalations', timestamps: false },
);

EscalationSchema.index({ status: 1, created_at: -1 });

export const Escalation = model<IEscalation>('Escalation', EscalationSchema);
