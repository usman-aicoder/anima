// Typed value shapes for company_wiki entries.
// company_wiki stores { company_name, category, key, value: unknown }.
// These interfaces define what `value` contains for each known key.

export interface SeoKeyword {
  keyword: string;
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  priority: 'high' | 'medium' | 'low';
  target_url: string;
}

export interface ContentGuidelines {
  tone: string;
  languages: string[];
  key_messages: string[];
  avoid: string[];
}

export interface TechStack {
  cms_type: string;
  cms_api_endpoint: string;
  social_platforms: string[];
  analytics_platform: string;
}

export interface PostingSchedule {
  platform: string;
  posts_per_week: number;
  best_times: string[];
}

export interface PartnerRequirements {
  required_fields: string[];
  vetting_criteria: Array<{
    field: string;
    expected_value: string;
    check_type: 'exact' | 'regex' | 'boolean' | 'range';
    failure_action: 'reject' | 'flag' | 'warn';
  }>;
  onboarding_steps: string[];
  status_labels: {
    interested: string;
    vetted: string;
    onboarded: string;
    active: string;
  };
}

export interface RequestSchema {
  fields: Array<{ name: string; type: string; required: boolean }>;
  status_flow: string[];
}

// Well-known category+key pairs used by agents
export const WIKI_KEYS = {
  SEO_KEYWORDS: { category: 'content', key: 'seo_keywords' },
  CONTENT_GUIDELINES: { category: 'content', key: 'content_guidelines' },
  TECH_STACK: { category: 'tech', key: 'tech_stack' },
  POSTING_SCHEDULE: { category: 'content', key: 'posting_schedule' },
  PARTNER_REQUIREMENTS: { category: 'operations', key: 'partner_requirements' },
  REQUEST_SCHEMA: { category: 'operations', key: 'request_schema' },
  MONTHLY_BUDGET: { category: 'finance', key: 'monthly_budget' },
  STRATEGY_AGENT_INTERVAL: { category: 'strategy', key: 'strategy_agent_interval' },
} as const;
