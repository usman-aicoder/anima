import { WorldModelClient, WIKI_KEYS, type TechStack, type PostingSchedule } from '@anima/core';

export async function scheduleSocialPost(
  company_name: string,
  content: string,
  linked_url?: string,
): Promise<string> {
  const [techStack, schedule] = await Promise.all([
    WorldModelClient.companyWiki.getTyped<TechStack>(
      company_name,
      WIKI_KEYS.TECH_STACK.category,
      WIKI_KEYS.TECH_STACK.key,
    ),
    WorldModelClient.companyWiki.getTyped<PostingSchedule[]>(
      company_name,
      WIKI_KEYS.POSTING_SCHEDULE.category,
      WIKI_KEYS.POSTING_SCHEDULE.key,
    ),
  ]);

  if (!techStack || !techStack.social_platforms || techStack.social_platforms.length === 0) {
    return 'No social platforms configured in company_wiki.tech_stack.social_platforms. Cannot schedule post.';
  }

  const platforms = techStack.social_platforms;
  const scheduleMap = new Map(schedule?.map((s) => [s.platform, s]) ?? []);

  const lines = [
    `Social post scheduled for ${company_name}:`,
    `Content: "${content.slice(0, 120)}${content.length > 120 ? '...' : ''}"`,
    linked_url ? `Link: ${linked_url}` : '',
    '',
    'Platforms:',
  ].filter(Boolean);

  for (const platform of platforms) {
    const platformSchedule = scheduleMap.get(platform);
    const cadence = platformSchedule
      ? `${platformSchedule.posts_per_week}x/week, best times: ${platformSchedule.best_times.join(', ')}`
      : 'no schedule configured — using default cadence';
    lines.push(`  ${platform}: ${cadence}`);
  }

  lines.push('', 'Note: Actual platform API integration added when social accounts are connected (Sprint 8).');

  return lines.join('\n');
}
