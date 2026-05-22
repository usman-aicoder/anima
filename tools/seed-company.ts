/**
 * Seed a test company into company_wiki for local development and sprint validation.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx tsx tools/seed-company.ts
 *
 * Company: CleanPro UK — residential and commercial cleaning marketplace.
 * Language: English. Used to validate Growth Agent exit criteria.
 */

import { connect, disconnect, WorldModelClient, WIKI_KEYS } from '../packages/core/src/index.js';
import type {
  SeoKeyword,
  ContentGuidelines,
  TechStack,
  PostingSchedule,
  PartnerRequirements,
} from '../packages/core/src/index.js';

const COMPANY = 'CleanPro UK';
const SEEDED_BY = 'seed-script';

// ─── SEO Keywords ─────────────────────────────────────────────────────────────

const seoKeywords: SeoKeyword[] = [
  { keyword: 'house cleaning service london', intent: 'transactional', priority: 'high', target_url: '/house-cleaning-london' },
  { keyword: 'end of tenancy cleaning', intent: 'transactional', priority: 'high', target_url: '/end-of-tenancy-cleaning' },
  { keyword: 'deep cleaning service near me', intent: 'transactional', priority: 'high', target_url: '/deep-cleaning' },
  { keyword: 'office cleaning london', intent: 'transactional', priority: 'high', target_url: '/office-cleaning-london' },
  { keyword: 'how much does house cleaning cost uk', intent: 'informational', priority: 'medium', target_url: '/how-much-does-house-cleaning-cost' },
  { keyword: 'best cleaning companies london', intent: 'commercial', priority: 'medium', target_url: '/professional-cleaning-london' },
  { keyword: 'after builders cleaning service', intent: 'transactional', priority: 'medium', target_url: '/after-builders-cleaning' },
  { keyword: 'weekly cleaning service london', intent: 'transactional', priority: 'medium', target_url: '/weekly-cleaning' },
  { keyword: 'carpet cleaning service london', intent: 'transactional', priority: 'low', target_url: '/carpet-cleaning-london' },
  { keyword: 'move in move out cleaning', intent: 'transactional', priority: 'low', target_url: '/move-in-move-out-cleaning' },
];

// ─── Content Guidelines ───────────────────────────────────────────────────────

const contentGuidelines: ContentGuidelines = {
  tone: 'Professional, trustworthy, and friendly. Emphasise reliability and quality. Use clear British English. Avoid jargon.',
  languages: ['en'],
  key_messages: [
    'Vetted and background-checked cleaners',
    'Easy online booking in under 2 minutes',
    'Satisfaction guaranteed or we re-clean for free',
    'Flexible scheduling — weekly, fortnightly, or one-off',
    'Fully insured service',
  ],
  avoid: [
    'Superlatives without evidence ("cheapest", "best in the world")',
    'American English spellings (use "colour" not "color")',
    'Overpromising on arrival times',
    'Mentioning competitor names',
  ],
};

// ─── Tech Stack ───────────────────────────────────────────────────────────────

const techStack: TechStack = {
  cms_type: 'wordpress',
  cms_api_endpoint: 'https://cms.cleanpro.co.uk/wp-json/wp/v2',
  social_platforms: ['instagram', 'facebook', 'linkedin'],
  analytics_platform: 'google_analytics_4',
};

// ─── Posting Schedule ─────────────────────────────────────────────────────────

const postingSchedule: PostingSchedule[] = [
  {
    platform: 'instagram',
    posts_per_week: 4,
    best_times: ['09:00', '12:00', '18:00'],
  },
  {
    platform: 'facebook',
    posts_per_week: 3,
    best_times: ['10:00', '15:00'],
  },
  {
    platform: 'linkedin',
    posts_per_week: 2,
    best_times: ['08:00', '12:30'],
  },
];

// ─── Partner Requirements ─────────────────────────────────────────────────────

const partnerRequirements: PartnerRequirements = {
  required_fields: [
    'companies_house_number',
    'public_liability_insurance',
    'dbs_check',
    'reference_count',
    'service_categories',
  ],
  vetting_criteria: [
    {
      field: 'public_liability_insurance',
      expected_value: 'true',
      check_type: 'boolean',
      failure_action: 'reject',
    },
    {
      field: 'dbs_check',
      expected_value: 'clear',
      check_type: 'exact',
      failure_action: 'reject',
    },
    {
      field: 'reference_count',
      expected_value: '2',
      check_type: 'range',
      failure_action: 'flag',
    },
  ],
  onboarding_steps: [
    'Submit Companies House number',
    'Upload public liability insurance certificate',
    'Submit DBS check certificate',
    'Provide 2 client references',
    'Complete service area and category form',
    'Agree to platform terms and quality standards',
  ],
  status_labels: {
    interested: 'Applied',
    vetted: 'Approved',
    onboarded: 'Onboarding',
    active: 'Active Partner',
  },
};

// ─── Finance ──────────────────────────────────────────────────────────────────

const monthlyBudget = 2500; // GBP

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    console.error('Error: MONGODB_URI environment variable is required.');
    console.error('Usage: MONGODB_URI=<uri> npx tsx tools/seed-company.ts');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  await connect(uri);
  console.log(`Connected.\n`);

  const entries: Array<{ category: string; key: string; value: unknown; label: string }> = [
    { ...WIKI_KEYS.SEO_KEYWORDS, value: seoKeywords, label: `${seoKeywords.length} SEO keywords` },
    { ...WIKI_KEYS.CONTENT_GUIDELINES, value: contentGuidelines, label: 'content guidelines (en)' },
    { ...WIKI_KEYS.TECH_STACK, value: techStack, label: `tech stack (${techStack.cms_type}, ${techStack.social_platforms.join(', ')})` },
    { ...WIKI_KEYS.POSTING_SCHEDULE, value: postingSchedule, label: `posting schedule (${postingSchedule.length} platforms)` },
    { ...WIKI_KEYS.PARTNER_REQUIREMENTS, value: partnerRequirements, label: `partner requirements (${partnerRequirements.vetting_criteria.length} vetting checks)` },
    { ...WIKI_KEYS.MONTHLY_BUDGET, value: monthlyBudget, label: `monthly budget £${monthlyBudget}` },
    {
      ...WIKI_KEYS.STRATEGY_AGENT_INTERVAL,
      value: 30,
      label: 'strategy agent interval 30 min',
    },
  ];

  console.log(`Seeding company_wiki for: ${COMPANY}\n`);

  for (const entry of entries) {
    await WorldModelClient.companyWiki.set(
      COMPANY,
      entry.category,
      entry.key,
      entry.value,
      SEEDED_BY,
    );
    console.log(`  ✓  ${entry.category}/${entry.key} — ${entry.label}`);
  }

  // Seed quality_config defaults for all 5 agents
  console.log('\nSeeding quality_config defaults...');
  await WorldModelClient.qualityConfig.seedDefaults();
  console.log('  ✓  quality_config seeded for all 5 agents');

  console.log(`\nDone. ${COMPANY} is ready in company_wiki.`);
  console.log(`\nTo verify, run the Growth Agent check_rankings tool against company: "${COMPANY}"`);

  await disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
