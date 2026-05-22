import { WorldModelClient, WIKI_KEYS, type SeoKeyword } from '@anima/core';

export interface RankingResult {
  keyword: string;
  intent: string;
  priority: string;
  target_url: string;
  status: 'not_tracking' | 'no_data' | 'tracked';
  note: string;
}

export async function checkRankings(company_name: string): Promise<string> {
  const keywords = await WorldModelClient.companyWiki.getTyped<SeoKeyword[]>(
    company_name,
    WIKI_KEYS.SEO_KEYWORDS.category,
    WIKI_KEYS.SEO_KEYWORDS.key,
  );

  if (!keywords || keywords.length === 0) {
    return 'No keywords configured yet. Run the Strategy Agent onboarding to populate company_wiki.seo_keywords.';
  }

  const results: RankingResult[] = keywords.map((kw) => ({
    keyword: kw.keyword,
    intent: kw.intent,
    priority: kw.priority,
    target_url: kw.target_url,
    status: kw.target_url ? 'tracked' : 'not_tracking',
    note: kw.target_url
      ? `Tracking for ${kw.target_url} — live rank data requires Search Console integration (Sprint 8).`
      : 'No target URL assigned yet.',
  }));

  const summary = [
    `Keyword status for ${company_name}: ${results.length} keywords configured.`,
    `High priority: ${results.filter((r) => r.priority === 'high').length}`,
    `Medium priority: ${results.filter((r) => r.priority === 'medium').length}`,
    `Low priority: ${results.filter((r) => r.priority === 'low').length}`,
    '',
    'Keywords:',
    ...results.map(
      (r) => `  [${r.priority.toUpperCase()}] "${r.keyword}" (${r.intent}) → ${r.target_url || 'no URL'} — ${r.note}`,
    ),
  ].join('\n');

  return summary;
}
