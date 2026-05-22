import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient } from '@anima/core';
import type { OnboardingResult, HumanTaskDraft } from './types.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface GeneratedHumanTasks {
  tasks_created: number;
  task_ids: string[];
}

export async function generateHumanTasks(
  company_name: string,
  onboarding_result: OnboardingResult,
): Promise<GeneratedHumanTasks> {
  const facts = onboarding_result.facts_written;
  const factSummary = facts
    .slice(0, 40)
    .map((f) => `${f.category}.${f.key}: ${JSON.stringify(f.value)}`)
    .join('\n');

  const prompt = `You are generating a prioritised list of human tasks that the business owner must complete to get this business operational. These are tasks that AI agents cannot do — they require a human signature, legal presence, or payment.

Company: "${company_name}"

Business facts gathered during onboarding:
${factSummary}

Generate a JSON array of tasks the human owner must complete. Each task:
{
  "title": "Action-oriented task title",
  "description": "Full instructions. What to do, where to do it, what evidence to upload when done.",
  "priority": "critical" | "high" | "medium" | "low",
  "due_days": number  // days from today this should be done
}

Rules:
- Only include tasks a human MUST do (register company, open bank account, purchase domain, sign contracts, etc.)
- Do NOT include tasks an AI agent can handle
- Tailor tasks to this specific business type — do not generate generic templates
- Order by priority: legal/financial prerequisites first
- Return only the JSON array.`;

  const response = await client.messages.create({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text');
  let drafts: HumanTaskDraft[] = [];

  if (text?.type === 'text') {
    try {
      const raw = text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(raw) as HumanTaskDraft[];
      drafts = Array.isArray(parsed) ? parsed : [];
    } catch {
      drafts = [];
    }
  }

  const task_ids: string[] = [];
  const now = new Date();

  for (const draft of drafts) {
    const due_date = new Date(now.getTime() + draft.due_days * 24 * 60 * 60 * 1000);
    const created = await WorldModelClient.tasks.create({
      task_id: uuidv4(),
      type: 'human',
      title: draft.title,
      description: draft.description,
      owner_agent: 'human_proxy',
      status: 'pending',
      priority: draft.priority,
      due_date,
      blocked_by: [],
      completion: {
        completed_at: null,
        completed_by: '',
        evidence: [],
      },
      created_by: 'strategy-agent',
      created_at: now,
    });
    task_ids.push(created.task_id);
  }

  return { tasks_created: task_ids.length, task_ids };
}
