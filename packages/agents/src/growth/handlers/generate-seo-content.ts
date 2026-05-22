import Anthropic from '@anthropic-ai/sdk';
import { WorldModelClient, WIKI_KEYS, type SeoKeyword, type ContentGuidelines } from '@anima/core';

export interface SeoPageOutline {
  title: string;
  meta_description: string;
  h1: string;
  sections: string[];
  internal_links: string[];
  language: string;
}

export async function generateSeoContent(
  company_name: string,
  keyword: string,
  target_url: string,
): Promise<string> {
  const [keywords, guidelines] = await Promise.all([
    WorldModelClient.companyWiki.getTyped<SeoKeyword[]>(
      company_name,
      WIKI_KEYS.SEO_KEYWORDS.category,
      WIKI_KEYS.SEO_KEYWORDS.key,
    ),
    WorldModelClient.companyWiki.getTyped<ContentGuidelines>(
      company_name,
      WIKI_KEYS.CONTENT_GUIDELINES.category,
      WIKI_KEYS.CONTENT_GUIDELINES.key,
    ),
  ]);

  if (!keywords || keywords.length === 0) {
    return 'No keywords configured yet. Cannot generate SEO content.';
  }
  if (!guidelines) {
    return 'No content guidelines configured. Cannot generate content without brand voice.';
  }

  const kwData = keywords.find((k) => k.keyword === keyword);
  if (!kwData) {
    return `Keyword "${keyword}" not found in company_wiki.seo_keywords. Add it during onboarding before generating content.`;
  }

  const primaryLanguage = guidelines.languages[0] ?? 'en';

  const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

  const prompt = [
    `You are writing SEO content for a business with these brand guidelines:`,
    `- Tone: ${guidelines.tone}`,
    `- Language: ${primaryLanguage} (write the entire page in this language)`,
    `- Key messages: ${guidelines.key_messages.join(', ')}`,
    `- Avoid: ${guidelines.avoid.join(', ')}`,
    ``,
    `Generate a complete SEO page outline for this keyword:`,
    `- Keyword: "${keyword}"`,
    `- Search intent: ${kwData.intent}`,
    `- Target URL: ${target_url}`,
    ``,
    `Return a JSON object with exactly these fields:`,
    `{`,
    `  "title": "page title with keyword (max 60 chars)",`,
    `  "meta_description": "compelling description with keyword (max 160 chars)",`,
    `  "h1": "main heading",`,
    `  "sections": ["section heading 1", "section heading 2", ...],`,
    `  "internal_links": ["suggested internal link anchor text", ...]`,
    `}`,
    ``,
    `Write everything in ${primaryLanguage}. Return only the JSON object.`,
  ].join('\n');

  const response = await client.messages.create({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') {
    return 'Failed to generate content outline.';
  }

  return [
    `SEO content outline generated for "${keyword}" (${company_name}):`,
    `Language: ${primaryLanguage}`,
    ``,
    text.text,
  ].join('\n');
}
