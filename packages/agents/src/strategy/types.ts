export interface IntakeQuestion {
  id: number;
  question: string;
  wiki_hint: string; // what company_wiki fields this answer populates
}

export interface IntakeAnswer {
  question_id: number;
  question: string;
  answer: string;
}

export interface ExtractedFact {
  category: string;
  key: string;
  value: unknown;
}

export interface OnboardingResult {
  company_name: string;
  answers: IntakeAnswer[];
  facts_written: ExtractedFact[];
  documents_ingested: number;
  goal_tree_created: boolean;
  human_tasks_created: number;
}

export interface GoalTreeInput {
  business_type: string;
  market: string;
  success_1m: string;
  success_3m: string;
  monthly_budget: number;
  primary_challenge: string;
  company_name: string;
}

export interface GoalDraft {
  type: 'strategic' | 'outcome' | 'milestone';
  title: string;
  objective: string;
  metric_name: string;
  metric_unit: string;
  target_value: number;
  deadline_months: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  completion_criteria?: string;
}

export interface HumanTaskDraft {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_days: number; // days from now
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: 1,
    question: 'What is the business name and its legal structure (e.g. Ltd, sole trader, LLC)?',
    wiki_hint: 'identity.company_name, identity.legal_structure',
  },
  {
    id: 2,
    question: 'What product or service does this business sell?',
    wiki_hint: 'services.description, services.categories',
  },
  {
    id: 3,
    question: 'Who is the target customer? Describe in 2-3 sentences.',
    wiki_hint: 'customer_profile.description, customer_profile.demographics',
  },
  {
    id: 4,
    question: 'What geography or market are you targeting first?',
    wiki_hint: 'market.geography, market.cities',
  },
  {
    id: 5,
    question: 'What is the primary business challenge right now?',
    wiki_hint: 'strategy.primary_challenge',
  },
  {
    id: 6,
    question: 'What does success look like in 1 month? In 3 months?',
    wiki_hint: 'strategy.success_1m, strategy.success_3m',
  },
  {
    id: 7,
    question: 'What is the approximate monthly operations budget?',
    wiki_hint: 'finance.monthly_budget, finance.currency',
  },
  {
    id: 8,
    question: 'What tools and platforms are you already using or have access to?',
    wiki_hint: 'tech.cms_type, tech.social_platforms, tech.analytics',
  },
  {
    id: 9,
    question: 'Are there any regulatory, legal, or compliance constraints we need to know about?',
    wiki_hint: 'regulatory.constraints, regulatory.certifications_required',
  },
  {
    id: 10,
    question: 'Who else will be involved — employees, contractors, advisors?',
    wiki_hint: 'people.team, people.advisors',
  },
];
