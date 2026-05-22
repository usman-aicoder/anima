import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IJob extends Document {
  job_id: string;
  customer_id: string;
  provider_id: string | null;
  service_type: string;
  geography: string;
  scheduled_at: Date | null;
  completed_at: Date | null;
  status: 'requested' | 'assigned' | 'completed' | 'cancelled' | 'disputed';
  estimated_hours: number;
  actual_hours: number | null;
  labor_cost: number;
  platform_fee: number;
  rut_deduction: number;
  net_customer_payment: number;
  quality_rating: number | null;
  acquisition_source: string;
  created_at: Date;
}

const JobSchema = new Schema<IJob>(
  {
    job_id: { type: String, default: uuidv4, unique: true, index: true },
    customer_id: { type: String, required: true },
    provider_id: { type: String, default: null },
    service_type: { type: String, required: true },
    geography: { type: String, required: true },
    scheduled_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['requested', 'assigned', 'completed', 'cancelled', 'disputed'],
      default: 'requested',
    },
    estimated_hours: { type: Number, default: 0 },
    actual_hours: { type: Number, default: null },
    labor_cost: { type: Number, default: 0 },
    platform_fee: { type: Number, default: 0 },
    rut_deduction: { type: Number, default: 0 },
    net_customer_payment: { type: Number, default: 0 },
    quality_rating: { type: Number, default: null },
    acquisition_source: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'jobs', timestamps: false },
);

JobSchema.index({ status: 1, created_at: -1 });
JobSchema.index({ customer_id: 1 });
JobSchema.index({ provider_id: 1 });

export const Job = model<IJob>('Job', JobSchema);
