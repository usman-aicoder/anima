import Anthropic from '@anthropic-ai/sdk';
import { WorldModelClient } from '@anima/core';
import { writeFacts } from './wiki-writer.js';
import type { ExtractedFact } from './types.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface IngestedDocument {
  title: string;
  facts_extracted: number;
  document_id: string;
}

export async function ingestDocument(
  company_name: string,
  title: string,
  content_text: string,
  tags: string[] = [],
): Promise<IngestedDocument> {
  // Store the raw document in the documents collection
  const doc = await WorldModelClient.documents.create({
    title,
    type: 'uploaded',
    content_text,
    tags: [...tags, company_name.toLowerCase().replace(/\s+/g, '-')],
    uploaded_by: 'strategy-agent',
    vector_embedding: [],
  });

  // Extract structured facts using Claude API
  const prompt = `You are extracting structured business facts from a document to populate a company knowledge base.

Document title: "${title}"
Company: "${company_name}"

Document content:
---
${content_text.slice(0, 8000)}
---

Extract all structured facts relevant to running this business. Return a JSON array where each object has:
- "category": one of ["identity", "market", "services", "customer_profile", "strategy", "finance", "tech", "regulatory", "people", "content", "operations", "competitive"]
- "key": descriptive snake_case name for the fact
- "value": the extracted value (string, number, array of strings, or object)

Focus on actionable facts: keywords, competitor data, pricing, services offered, target markets, compliance requirements.
Return only the JSON array.`;

  const response = await client.messages.create({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text');
  let facts: ExtractedFact[] = [];

  if (text?.type === 'text') {
    try {
      const raw = text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(raw) as ExtractedFact[];
      facts = Array.isArray(parsed) ? parsed : [];
    } catch {
      facts = [];
    }
  }

  await writeFacts(company_name, facts, `document-ingestor:${doc.document_id}`);

  return {
    title,
    facts_extracted: facts.length,
    document_id: doc.document_id,
  };
}
