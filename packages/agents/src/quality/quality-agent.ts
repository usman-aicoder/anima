import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import {
  BaseAgent,
  WorldModelClient,
  type AgentContext,
  type ActionRequest,
  type ActionResult,
  type PreHookResult,
} from '@anima/core';
import { QUALITY_TOOLS } from './tools.js';
import { runThresholdChecks } from './handlers/run-threshold-checks.js';
import { checkGoalHealth } from './handlers/check-goal-health.js';
import { escalateQualityIssue } from './handlers/escalate-quality-issue.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class QualityAgent extends BaseAgent {
  private readonly company_name: string;
  private readonly staticPrompt: string;

  constructor(company_name: string) {
    super();
    this.company_name = company_name;
    this.staticPrompt = readFileSync(join(__dirname, 'AGENTS.md'), 'utf-8');
  }

  getAgentName() {
    return 'quality' as const;
  }

  getIterationCap() {
    return 10;
  }

  getTools(): Tool[] {
    return QUALITY_TOOLS;
  }

  getStaticPrompt(): string {
    return this.staticPrompt;
  }

  async assembleContext(): Promise<AgentContext> {
    const agentNames = ['growth', 'operations', 'finance', 'strategy', 'quality'] as const;

    const [configs, unresolvedAlerts, activeGoals] = await Promise.all([
      Promise.all(agentNames.map((a) => WorldModelClient.qualityConfig.findByAgent(a))),
      WorldModelClient.qualityAlerts.findUnresolved(),
      WorldModelClient.goals.findActive(),
    ]);

    const quality_config: Record<string, unknown> = {};
    agentNames.forEach((name, i) => {
      const cfg = configs[i];
      if (cfg) quality_config[name] = cfg.thresholds;
    });

    return {
      company_name: this.company_name,
      goals: activeGoals,
      company_wiki: {},
      quality_config,
      unresolved_alerts: unresolvedAlerts.map((a) => ({
        alert_id: a.alert_id,
        agent: a.agent,
        alert_type: a.alert_type,
        severity: a.severity,
        message: a.message,
        created_at: a.created_at,
      })),
    };
  }

  async preHook(action: ActionRequest): Promise<PreHookResult> {
    // Quality agent is read-only — block any tool not in its approved list
    const allowed = ['run_threshold_checks', 'check_goal_health', 'escalate_quality_issue'];
    if (!allowed.includes(action.tool_name)) {
      return { allowed: false, reason: 'Quality agent is read-only. This tool is not permitted.' };
    }
    return { allowed: true };
  }

  async executeTool(action: ActionRequest, _context: AgentContext): Promise<ActionResult> {
    const input = action.tool_input as Record<string, unknown>;
    const company = (input['company_name'] as string | undefined) ?? this.company_name;

    let output: string;
    let world_model_update: Record<string, unknown> = {};

    switch (action.tool_name) {
      case 'run_threshold_checks':
        output = await runThresholdChecks(company);
        world_model_update = { threshold_checks_run_at: new Date().toISOString() };
        break;

      case 'check_goal_health':
        output = await checkGoalHealth(company);
        world_model_update = { goal_health_checked_at: new Date().toISOString() };
        break;

      case 'escalate_quality_issue':
        output = await escalateQualityIssue(
          company,
          input['alert_id'] as string,
          input['recommended_action'] as string,
        );
        world_model_update = { escalation_created: input['alert_id'] };
        break;

      default:
        output = `Unknown tool: ${action.tool_name}`;
    }

    return { tool_name: action.tool_name, output, world_model_update };
  }

  async postHook(
    result: ActionResult,
    session_id: string,
    _context: AgentContext,
  ): Promise<void> {
    await this.logger.log({
      session_id,
      agent: this.getAgentName(),
      decision_type: result.tool_name,
      input_signal: `company: ${this.company_name}`,
      decision: `quality check: ${result.tool_name}`,
      reasoning: 'Quality agent monitoring run',
      output: result.output.slice(0, 500),
      world_model_update: result.world_model_update,
    });
  }
}
