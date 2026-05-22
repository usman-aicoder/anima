import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import {
  BaseAgent,
  WorldModelClient,
  WIKI_KEYS,
  type AgentContext,
  type ActionRequest,
  type ActionResult,
  type PreHookResult,
  type PartnerRequirements,
  type RequestSchema,
} from '@anima/core';
import { OPERATIONS_TOOLS } from './tools.js';
import { vetProvider } from './handlers/vet-provider.js';
import { assignJob } from './handlers/assign-job.js';
import { completeJob } from './handlers/complete-job.js';
import { updateProviderScore } from './handlers/update-provider-score.js';
import { flagQualityIssue } from './handlers/flag-quality-issue.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Triggers that require human escalation before proceeding
const ESCALATION_KEYWORDS = ['damage', 'compensation', 'legal', 'terminate', 'termination'];

export class OperationsAgent extends BaseAgent {
  private readonly company_name: string;
  private readonly staticPrompt: string;

  constructor(company_name: string) {
    super();
    this.company_name = company_name;
    this.staticPrompt = readFileSync(join(__dirname, 'AGENTS.md'), 'utf-8');
  }

  getAgentName() {
    return 'operations' as const;
  }

  getIterationCap() {
    return 20;
  }

  getTools(): Tool[] {
    return OPERATIONS_TOOLS;
  }

  getStaticPrompt(): string {
    return this.staticPrompt;
  }

  async assembleContext(): Promise<AgentContext> {
    const [goals, partnerRequirements, requestSchema, openJobs, recentDecisions] =
      await Promise.all([
        this.wm.goals.findActive('operations'),
        this.wm.companyWiki.getTyped<PartnerRequirements>(
          this.company_name,
          WIKI_KEYS.PARTNER_REQUIREMENTS.category,
          WIKI_KEYS.PARTNER_REQUIREMENTS.key,
        ),
        this.wm.companyWiki.getTyped<RequestSchema>(
          this.company_name,
          WIKI_KEYS.REQUEST_SCHEMA.category,
          WIKI_KEYS.REQUEST_SCHEMA.key,
        ),
        this.wm.jobs.find({ status: 'requested' }),
        this.wm.agentDecisions.findRecent('operations', 10),
      ]);

    return {
      company_name: this.company_name,
      goals,
      company_wiki: {
        partner_requirements: partnerRequirements ?? null,
        request_schema: requestSchema ?? null,
      },
      open_jobs: openJobs.map((j) => ({
        job_id: j.job_id,
        service_type: j.service_type,
        geography: j.geography,
        status: j.status,
      })),
      recent_decisions: recentDecisions,
    };
  }

  async preHook(action: ActionRequest): Promise<PreHookResult> {
    const input = action.tool_input as Record<string, unknown>;

    // Block any action whose reason mentions compensation, damage, termination, or legal
    const reason = String(input['reason'] ?? '').toLowerCase();
    if (
      action.tool_name === 'flag_quality_issue' &&
      ESCALATION_KEYWORDS.some((kw) => reason.includes(kw))
    ) {
      return {
        allowed: false,
        reason: `Issue involves "${reason}" — requires human proxy decision before flagging.`,
      };
    }

    return { allowed: true };
  }

  async executeTool(action: ActionRequest, _context: AgentContext): Promise<ActionResult> {
    const input = action.tool_input as Record<string, unknown>;
    const company = (input['company_name'] as string | undefined) ?? this.company_name;

    let output: string;
    let world_model_update: Record<string, unknown> = {};

    switch (action.tool_name) {
      case 'vet_provider': {
        output = await vetProvider(company, input['provider_id'] as string);
        world_model_update = { vetting_run_at: new Date().toISOString() };
        break;
      }

      case 'assign_job': {
        output = await assignJob(company, input['job_id'] as string);
        world_model_update = { job_assigned: input['job_id'] };
        break;
      }

      case 'complete_job': {
        output = await completeJob(
          company,
          input['job_id'] as string,
          input['actual_hours'] as number,
          input['quality_rating'] as number,
        );
        world_model_update = { job_completed: input['job_id'] };
        break;
      }

      case 'update_provider_score': {
        output = await updateProviderScore(
          company,
          input['provider_id'] as string,
          input['service_type'] as string,
        );
        world_model_update = {
          provider_score_updated: input['provider_id'],
          service_type: input['service_type'],
        };
        break;
      }

      case 'flag_quality_issue': {
        output = await flagQualityIssue(
          company,
          input['provider_id'] as string,
          input['reason'] as string,
          input['severity'] as 'warning' | 'critical' | 'emergency',
        );
        world_model_update = { quality_alert_created: input['provider_id'] };
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
      reasoning: `Operations agent tool call for ${this.company_name}`,
      output: result.output.slice(0, 500),
      world_model_update: result.world_model_update,
    });

    // Update operations goal progress when jobs are completed
    if (result.tool_name === 'complete_job' && context.goals.length > 0) {
      const completedJobs = await this.wm.jobs.find({ status: 'completed' });
      const jobGoal = context.goals.find(
        (g) =>
          g.metric.name.toLowerCase().includes('job') ||
          g.metric.name.toLowerCase().includes('provider'),
      );
      if (jobGoal) {
        await this.wm.goals.updateProgress(
          jobGoal.goal_id,
          completedJobs.length,
          Math.min(100, Math.round((completedJobs.length / jobGoal.metric.target_value) * 100)),
        );
      }
    }
  }
}
