import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AlertType =
  | 'token_overrun'
  | 'cost_overrun'
  | 'agent_idle'
  | 'agent_failing'
  | 'unusual_decision'
  | 'monthly_budget_breach';

export type AlertSeverity = 'warning' | 'critical' | 'emergency';

export interface IQualityAlert extends Document {
  alert_id: string;
  agent: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  threshold_value: number;
  actual_value: number;
  message: string;
  resolved: boolean;
  resolved_at: Date | null;
  created_at: Date;
}

const QualityAlertSchema = new Schema<IQualityAlert>(
  {
    alert_id: { type: String, default: uuidv4, unique: true, index: true },
    agent: { type: String, required: true },
    alert_type: {
      type: String,
      enum: [
        'token_overrun',
        'cost_overrun',
        'agent_idle',
        'agent_failing',
        'unusual_decision',
        'monthly_budget_breach',
      ],
      required: true,
    },
    severity: { type: String, enum: ['warning', 'critical', 'emergency'], required: true },
    threshold_value: { type: Number, required: true },
    actual_value: { type: Number, required: true },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    resolved_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'quality_alerts', timestamps: false },
);

QualityAlertSchema.index({ agent: 1, severity: 1, resolved: 1 });

export const QualityAlert = model<IQualityAlert>('QualityAlert', QualityAlertSchema);
