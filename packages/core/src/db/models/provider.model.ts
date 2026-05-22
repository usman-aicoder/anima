import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IProvider extends Document {
  provider_id: string;
  company_name: string;
  org_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  rut_certified: boolean;
  verified_at: Date | null;
  active: boolean;
  status: 'interested' | 'vetted' | 'onboarded' | 'active' | 'suspended';
  competencies: Array<{
    service_type: string;
    quality_score: number;
    job_count: number;
    avg_response_time_hours: number;
    last_job_date: Date;
  }>;
  geographic_coverage: Array<{ city: string; postal_prefix: string }>;
  created_at: Date;
  deprecated_at: Date | null;
}

const ProviderSchema = new Schema<IProvider>(
  {
    provider_id: { type: String, default: uuidv4, unique: true, index: true },
    company_name: { type: String, required: true },
    org_number: { type: String, default: '' },
    contact_name: { type: String, default: '' },
    contact_email: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    rut_certified: { type: Boolean, default: false },
    verified_at: { type: Date, default: null },
    active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['interested', 'vetted', 'onboarded', 'active', 'suspended'],
      default: 'interested',
    },
    competencies: [
      {
        service_type: String,
        quality_score: { type: Number, default: 0 },
        job_count: { type: Number, default: 0 },
        avg_response_time_hours: { type: Number, default: 0 },
        last_job_date: Date,
      },
    ],
    geographic_coverage: [{ city: String, postal_prefix: String }],
    created_at: { type: Date, default: Date.now },
    deprecated_at: { type: Date, default: null },
  },
  { collection: 'providers', timestamps: false },
);

export const Provider = model<IProvider>('Provider', ProviderSchema);
