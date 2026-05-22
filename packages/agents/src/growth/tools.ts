import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const GROWTH_TOOLS: Tool[] = [
  {
    name: 'check_rankings',
    description:
      'Check current search ranking positions for all keywords in company_wiki.seo_keywords. Returns rank status per keyword. Always call this first in a ranking-review session.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: {
          type: 'string',
          description: 'The company name to look up keywords for in company_wiki.',
        },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'generate_seo_content',
    description:
      'Generate a complete SEO page outline for a given keyword. Uses tone, language, and messaging from company_wiki.content_guidelines. Returns title, meta description, H1, section headings, and internal link suggestions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: {
          type: 'string',
          description: 'Company name to fetch content guidelines from company_wiki.',
        },
        keyword: {
          type: 'string',
          description: 'Target keyword for the page. Must exist in company_wiki.seo_keywords.',
        },
        target_url: {
          type: 'string',
          description: 'URL slug where the page will be published.',
        },
      },
      required: ['company_name', 'keyword', 'target_url'],
    },
  },
  {
    name: 'publish_page',
    description:
      'Publish a generated page to the CMS configured in company_wiki.tech_stack.cms_api_endpoint. Requires page content from generate_seo_content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: {
          type: 'string',
          description: 'Company name to fetch CMS config from company_wiki.',
        },
        target_url: {
          type: 'string',
          description: 'URL slug for the page.',
        },
        title: { type: 'string', description: 'Page title.' },
        meta_description: { type: 'string', description: 'Meta description (max 160 chars).' },
        content: { type: 'string', description: 'Full page content in markdown.' },
      },
      required: ['company_name', 'target_url', 'title', 'meta_description', 'content'],
    },
  },
  {
    name: 'schedule_social_post',
    description:
      'Schedule a social post to all platforms configured in company_wiki.tech_stack.social_platforms, following the cadence in company_wiki.posting_schedule.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: {
          type: 'string',
          description: 'Company name to fetch social config from company_wiki.',
        },
        content: { type: 'string', description: 'Post text.' },
        linked_url: {
          type: 'string',
          description: 'URL to include in the post (optional).',
        },
      },
      required: ['company_name', 'content'],
    },
  },
];
