import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ICompanyWiki extends Document {
  wiki_id: string;
  company_name: string;
  category: string;
  key: string;
  value: unknown;
  version: number;
  previous_value: unknown | null;
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}

const CompanyWikiSchema = new Schema<ICompanyWiki>(
  {
    wiki_id: { type: String, default: uuidv4, unique: true, index: true },
    company_name: { type: String, required: true },
    category: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
    previous_value: { type: Schema.Types.Mixed, default: null },
    updated_by: { type: String, required: true },
    updated_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'company_wiki', timestamps: false },
);

CompanyWikiSchema.index({ company_name: 1, category: 1, key: 1 }, { unique: true });

export const CompanyWiki = model<ICompanyWiki>('CompanyWiki', CompanyWikiSchema);
