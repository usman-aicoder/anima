import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ICapability extends Document {
  capability_id: string;
  service_type: string;
  geography: string;
  avg_cost: number;
  avg_completion_hours: number;
  quality_score_avg: number;
  provider_count: number;
  demand_signal: number;
  job_count_30d: number;
  updated_at: Date;
}

const CapabilitySchema = new Schema<ICapability>(
  {
    capability_id: { type: String, default: uuidv4, unique: true, index: true },
    service_type: { type: String, required: true },
    geography: { type: String, required: true },
    avg_cost: { type: Number, default: 0 },
    avg_completion_hours: { type: Number, default: 0 },
    quality_score_avg: { type: Number, default: 0 },
    provider_count: { type: Number, default: 0 },
    demand_signal: { type: Number, default: 0 },
    job_count_30d: { type: Number, default: 0 },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'capabilities', timestamps: false },
);

CapabilitySchema.index({ service_type: 1, geography: 1 }, { unique: true });

export const Capability = model<ICapability>('Capability', CapabilitySchema);
