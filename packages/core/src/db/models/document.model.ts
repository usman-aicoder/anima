import { Schema, model, Document as MongoDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IDocument extends MongoDocument {
  document_id: string;
  title: string;
  type: 'uploaded' | 'generated' | 'task_evidence' | 'review' | 'brief';
  content_text: string;
  vector_embedding: number[];
  tags: string[];
  linked_task_id: string | null;
  linked_goal_id: string | null;
  uploaded_by: string;
  created_at: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    document_id: { type: String, default: uuidv4, unique: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['uploaded', 'generated', 'task_evidence', 'review', 'brief'],
      required: true,
    },
    content_text: { type: String, default: '' },
    vector_embedding: [{ type: Number }],
    tags: [{ type: String }],
    linked_task_id: { type: String, default: null },
    linked_goal_id: { type: String, default: null },
    uploaded_by: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'documents', timestamps: false },
);

DocumentSchema.index({ type: 1, created_at: -1 });
DocumentSchema.index({ linked_task_id: 1 });
DocumentSchema.index({ tags: 1 });

export const AnimaDocument = model<IDocument>('Document', DocumentSchema);
