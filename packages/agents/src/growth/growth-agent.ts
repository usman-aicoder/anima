import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import {
  BaseAgent,
  WorldModelClient,
  WIKI_KEYS,
  type AgentContext,
  type ActionRequest,
  type ActionResult,
  type PreHookResult,
  type SeoKeyword,
  type ContentGuidelines,
  type TechStack,
  type PostingSchedule,
  type AgentName,
} from '@anima/core';
import { GROWTH_TOOLS } from './tools.js';
import { checkRankings } from './handlers/check-rankings.js';
import { generateSeoContent } from './handlers/generate-seo-content.js';
import { publishPage } from './handlers/publish-page.js';
import { scheduleSocialPost } from './handlers/schedule-social-post.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tools that require human escalation — never execute autonomously
const ESCALATION_REQUIRED = [
  'paid_advertising',
  'partnership_content',
  'pricing_claim',
  'press_response',
  'brand_pivot',
];

function loadStaticPrompt(): string {
  try {
    return readFileSync(join(__dirname, 'AGENTS.md'), 'utf-8');
  } catch {
    return '# Growth Agent\nYou are the Growth Agent. Drive organic traffic through SEO and content.';
  }
}

export class GrowthAgent extends BaseAgent {
  private readonly company_name: string;

  constructor(company_name: string) {
    super();
    this.company_name = company_name;
  }

  getAgentName(): AgentName {
    return 'growth';
  }

  getIterationCap(): number {
    return 20;
  }

  getTools(): Tool[] {
    return GROWTH_TOOLS;
  }

  getStaticPrompt(): string {
    return loadStaticPrompt();
  }

  async assembleContext(): Promise<AgentContext> {
    const [seo_keywords, content_guidelines, tech_stack, posting_schedule, goals] =
      await Promise.all([
        WorldModelClient.companyWiki.getTyped<SeoKeyword[]>(
          this.company_name,
          WIKI_KEYS.SEO_KEYWORDS.category,
          WIKI_KEYS.SEO_KEYWORDS.key,
        ),
        WorldModelClient.companyWiki.getTyped<ContentGuidelines>(
          this.company_name,
          WIKI_KEYS.CONTENT_GUIDELINES.category,
          WIKI_KEYS.CONTENT_GUIDELINES.key,
        ),
        WorldModelClient.companyWiki.getTyped<TechStack>(
          this.company_name,
          WIKI_KEYS.TECH_STACK.category,
          WIKI_KEYS.TECH_STACK.key,
        ),
        WorldModelClient.companyWiki.getTyped<PostingSchedule[]>(
          this.company_name,
          WIKI_KEYS.POSTING_SCHEDULE.category,
          WIKI_KEYS.POSTING_SCHEDULE.key,
        ),
        WorldModelClient.goals.findActive('growth'),
      ]);

    return {
      company_name: this.company_name,
      goals,
      company_wiki: {
        seo_keywords: seo_keywords ?? [],
        content_guidelines: content_guidelines ?? null,
        tech_stack: tech_stack ?? null,
        posting_schedule: posting_schedule ?? [],
      },
    };
  }

  async preHook(action: ActionRequest): Promise<PreHookResult> {
    const input = action.tool_input as Record<string, unknown>;

    // Block all paid advertising
    if (
      action.tool_name === 'publish_page' &&
      typeof input['content'] === 'string' &&
      /\b(ad|paid|sponsored|google ads|meta ads|facebook ads)\b/i.test(input['content'])
    ) {
      return {
        allowed: false,
        reason: 'Paid advertising requires human proxy approval.',
      };
    }

    // Block attempts to claim pricing or guarantees in content
    if (
      action.tool_name === 'generate_seo_content' &&
      typeof input['keyword'] === 'string' &&
      ESCALATION_REQUIRED.some((term) =>
        (input['keyword'] as string).toLowerCase().includes(term),
      )
    ) {
      return {
        allowed: false,
        reason: 'This content requires human proxy review before publishing.',
      };
    }

    return { allowed: true };
  }

  async executeTool(action: ActionRequest, _context: AgentContext): Promise<ActionResult> {
    const input = action.tool_input as Record<string, string>;

    let output: string;
    let world_model_update: Record<string, unknown> = {};

    switch (action.tool_name) {
      case 'check_rankings': {
        output = await checkRankings(input['company_name'] ?? this.company_name);
        world_model_update = { checked_at: new Date().toISOString() };
        break;
      }

      case 'generate_seo_content': {
        output = await generateSeoContent(
          input['company_name'] ?? this.company_name,
          input['keyword'] ?? '',
          input['target_url'] ?? '',
        );
        world_model_update = {
          content_generated_for: input['keyword'],
          generated_at: new Date().toISOString(),
        };
        break;
      }

      case 'publish_page': {
        output = await publishPage(
          input['company_name'] ?? this.company_name,
          input['target_url'] ?? '',
          input['title'] ?? '',
          input['meta_description'] ?? '',
          input['content'] ?? '',
        );
        world_model_update = {
          page_published: input['target_url'],
          published_at: new Date().toISOString(),
        };
        break;
      }

      case 'schedule_social_post': {
        output = await scheduleSocialPost(
          input['company_name'] ?? this.company_name,
          input['content'] ?? '',
          input['linked_url'],
        );
        world_model_update = { social_post_scheduled_at: new Date().toISOString() };
        break;
      }

      default:
        output = `Unknown tool: ${action.tool_name}`;
    }

    return { tool_name: action.tool_name, output, world_model_update };
  }

  async postHook(
    result: ActionResult,
    session_id: string,
    context: AgentContext,
  ): Promise<void> {
    await this.logger.log({
      session_id,
      agent: this.getAgentName(),
      decision_type: result.tool_name,
      input_signal: `company: ${this.company_name}`,
      decision: `executed ${result.tool_name}`,
      reasoning: `Tool called during growth mission for ${this.company_name}`,
      output: result.output.slice(0, 500),
      world_model_update: result.world_model_update,
    });

    // Update goal progress for content-publishing actions
    if (result.tool_name === 'publish_page' && context.goals.length > 0) {
      const trafficGoal = context.goals.find((g) =>
        g.metric.name.toLowerCase().includes('traffic') ||
        g.metric.name.toLowerCase().includes('visitor'),
      );
      if (trafficGoal) {
        await WorldModelClient.goals.updateProgress(
          trafficGoal.goal_id,
          trafficGoal.metric.current_value,
          trafficGoal.progress.pct,
        );
      }
    }
  }
}
