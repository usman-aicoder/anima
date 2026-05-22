import { Schema, model, Document } from 'mongoose';
import type { AgentName } from './agent-decision.model.js';
import type { AlertType, AlertSeverity } from './quality-alert.model.js';

export interface IQualityConfig extends Document {
  agent: AgentName;
  thresholds: {
    max_tokens_per_session: number;
    max_cost_per_day_sek: number;
    max_idle_hours: number;
    min_decisions_per_week: number;
    max_failed_sessions_consecutive: number;
    unusual_decision_detection: boolean;
    cost_total_monthly_sek: number;
  };
  alerts: Record<AlertType, AlertSeverity>;
  notification_channel: 'dashboard' | 'email' | 'both';
  updated_at: Date;
}

const alertLevelEnum = ['warning', 'critical', 'emergency'];

const QualityConfigSchema = new Schema<IQualityConfig>(
  {
    agent: {
      type: String,
      enum: ['growth', 'operations', 'finance', 'strategy', 'quality'],
      required: true,
      unique: true,
    },
    thresholds: {
      max_tokens_per_session: { type: Number, default: 80000 },
      max_cost_per_day_sek: { type: Number, default: 150 },
      max_idle_hours: { type: Number, default: 48 },
      min_decisions_per_week: { type: Number, default: 5 },
      max_failed_sessions_consecutive: { type: Number, default: 3 },
      unusual_decision_detection: { type: Boolean, default: true },
      cost_total_monthly_sek: { type: Number, default: 2000 },
    },
    alerts: {
      token_overrun: { type: String, enum: alertLevelEnum, default: 'warning' },
      cost_overrun: { type: String, enum: alertLevelEnum, default: 'critical' },
      agent_idle: { type: String, enum: alertLevelEnum, default: 'warning' },
      agent_failing: { type: String, enum: alertLevelEnum, default: 'critical' },
      unusual_decision: { type: String, enum: alertLevelEnum, default: 'warning' },
      monthly_budget_breach: { type: String, enum: alertLevelEnum, default: 'emergency' },
    },
    notification_channel: {
      type: String,
      enum: ['dashboard', 'email', 'both'],
      default: 'dashboard',
    },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'quality_config', timestamps: false },
);

export const QualityConfig = model<IQualityConfig>('QualityConfig', QualityConfigSchema);

export const DEFAULT_QUALITY_CONFIGS: Pick<IQualityConfig, 'agent' | 'thresholds' | 'alerts' | 'notification_channel'>[] =
  (['growth', 'operations', 'finance', 'strategy', 'quality'] as AgentName[]).map((agent) => ({
    agent,
    thresholds: {
      max_tokens_per_session: 80000,
      max_cost_per_day_sek: 150,
      max_idle_hours: 48,
      min_decisions_per_week: 5,
      max_failed_sessions_consecutive: 3,
      unusual_decision_detection: true,
      cost_total_monthly_sek: 2000,
    },
    alerts: {
      token_overrun: 'warning',
      cost_overrun: 'critical',
      agent_idle: 'warning',
      agent_failing: 'critical',
      unusual_decision: 'warning',
      monthly_budget_breach: 'emergency',
    } as Record<AlertType, AlertSeverity>,
    notification_channel: 'dashboard',
  }));
