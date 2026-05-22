import { WorldModelClient, WIKI_KEYS, type TechStack } from '@anima/core';

export interface PublishResult {
  published: boolean;
  url: string;
  cms_type: string;
  note: string;
}

export async function publishPage(
  company_name: string,
  target_url: string,
  title: string,
  meta_description: string,
  content: string,
): Promise<string> {
  const techStack = await WorldModelClient.companyWiki.getTyped<TechStack>(
    company_name,
    WIKI_KEYS.TECH_STACK.category,
    WIKI_KEYS.TECH_STACK.key,
  );

  if (!techStack) {
    return 'No tech stack configured. Cannot publish — company_wiki.tech_stack missing.';
  }
  if (!techStack.cms_api_endpoint) {
    return 'No CMS endpoint configured in company_wiki.tech_stack.cms_api_endpoint. Cannot publish.';
  }

  // In production this POSTs to the real CMS API.
  // During Sprint 2 the CMS integration is stubbed — actual HTTP call added when CMS is live.
  const payload = {
    url: target_url,
    title,
    meta_description,
    content,
    published_at: new Date().toISOString(),
  };

  const result: PublishResult = {
    published: true,
    url: target_url,
    cms_type: techStack.cms_type,
    note: `Stubbed publish to ${techStack.cms_type} at ${techStack.cms_api_endpoint}. Payload: ${JSON.stringify(payload).slice(0, 200)}...`,
  };

  return [
    `Page queued for publishing:`,
    `  URL: ${result.url}`,
    `  CMS: ${result.cms_type}`,
    `  Endpoint: ${techStack.cms_api_endpoint}`,
    `  Note: ${result.note}`,
  ].join('\n');
}
