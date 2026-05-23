import { createLLMClient } from '@anima/core';
import { writeFacts } from './wiki-writer.js';
import { INTAKE_QUESTIONS } from './types.js';
import type { IntakeAnswer, ExtractedFact, OnboardingResult } from './types.js';

async function extractFacts(
  question: string,
  answer: string,
  wiki_hint: string,
): Promise<ExtractedFact[]> {
  const client = createLLMClient();
  const prompt = `You are extracting structured facts from a business onboarding answer.

Question asked: "${question}"
Answer given: "${answer}"
Wiki fields this may populate: ${wiki_hint}

Extract all meaningful facts from this answer. Return a JSON array of objects, each with:
- "category": string (e.g. "identity", "market", "services", "customer_profile", "strategy", "finance", "tech", "regulatory", "people")
- "key": string (snake_case field name, e.g. "legal_structure", "target_geography", "monthly_budget")
- "value": the extracted value (string, number, array, or object as appropriate)

Rules:
- Extract only facts clearly stated in the answer. Do not infer or assume.
- For numbers (budget, headcount), extract as numbers not strings.
- For lists (cities, services, platforms), extract as arrays.
- If the answer is vague, extract a "description" key with the raw text.
- Return only the JSON array. No explanation.`;

  const summary = await client.summarize({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 1024,
    prompt,
  });

  try {
    const raw = summary.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw) as ExtractedFact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [{ category: 'intake', key: `q${INTAKE_QUESTIONS.findIndex(q => q.question === question) + 1}_raw`, value: answer }];
  }
}

export async function runIntake(
  answers: IntakeAnswer[],
): Promise<OnboardingResult> {
  if (answers.length === 0) throw new Error('No answers provided');

  const q1Answer = answers.find((a) => a.question_id === 1);
  if (!q1Answer) throw new Error('Question 1 (business name) is required');

  const client = createLLMClient();
  const nameRaw = await client.summarize({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 100,
    prompt: `Extract only the business name from this text. Return just the name, nothing else: "${q1Answer.answer}"`,
  });
  const company_name = nameRaw.trim().replace(/["'.]/g, '') || q1Answer.answer.split(/[\s,]/)[0] || 'Unknown';

  const allFacts: ExtractedFact[] = [];

  for (const answer of answers) {
    const question = INTAKE_QUESTIONS.find((q) => q.id === answer.question_id);
    if (!question) continue;

    const facts = await extractFacts(question.question, answer.answer, question.wiki_hint);
    allFacts.push(...facts);
    await writeFacts(company_name, facts, 'strategy-agent-intake');
  }

  return {
    company_name,
    answers,
    facts_written: allFacts,
    documents_ingested: 0,
    goal_tree_created: false,
    human_tasks_created: 0,
  };
}
