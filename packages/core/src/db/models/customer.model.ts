import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ICustomer extends Document {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  postal_code: string;
  rut_eligible: boolean;
  rut_used_ytd: number;
  rut_year: number;
  lifetime_value: number;
  last_interaction_at: Date;
  acquisition_source: string;
  created_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customer_id: { type: String, default: uuidv4, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    first_name: { type: String, default: '' },
    last_name: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    postal_code: { type: String, default: '' },
    rut_eligible: { type: Boolean, default: false },
    rut_used_ytd: { type: Number, default: 0 },
    rut_year: { type: Number, default: () => new Date().getFullYear() },
    lifetime_value: { type: Number, default: 0 },
    last_interaction_at: { type: Date, default: Date.now },
    acquisition_source: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'customers', timestamps: false },
);

export const Customer = model<ICustomer>('Customer', CustomerSchema);
