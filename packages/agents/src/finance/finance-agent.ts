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
import { FINANCE_TOOLS } from './tools.js';
import { generateInvoice } from './handlers/generate-invoice.js';
import { calculateRutDeduction } from './handlers/calculate-rut-deduction.js';
import { trackJobMargin } from './handlers/track-job-margin.js';
import { flagCostAnomaly } from './handlers/flag-cost-anomaly.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Disputes above this threshold require human escalation
const DISPUTE_ESCALATION_THRESHOLD = 1_000;

export class FinanceAgent extends BaseAgent {
  private readonly company_name: string;
  private readonly staticPrompt: string;

  constructor(company_name: string) {
    super();
    this.company_name = company_name;
    this.staticPrompt = readFileSync(join(__dirname, 'AGENTS.md'), 'utf-8');
  }

  getAgentName() {
    return 'finance' as const;
  }

  getIterationCap() {
    return 20;
  }

  getTools(): Tool[] {
    return FINANCE_TOOLS;
  }

  getStaticPrompt(): string {
    return this.staticPrompt;
  }

  async assembleContext(): Promise<AgentContext> {
    // Completed jobs not yet invoiced (net_customer_payment = 0)
    const completedJobs = await this.wm.jobs.find({ status: 'completed' });
    const uninvoiced = completedJobs.filter((j) => j.net_customer_payment === 0);

    const [goals, recentDecisions] = await Promise.all([
      this.wm.goals.findActive('finance'),
      this.wm.agentDecisions.findRecent('finance', 10),
    ]);

    const marginData = await this.wm.companyWiki.getTyped<Record<string, unknown>>(
      this.company_name,
      'finance',
      'margin_by_service',
    );

    return {
      company_name: this.company_name,
      goals,
      company_wiki: {
        margin_by_service: marginData ?? {},
      },
      uninvoiced_jobs: uninvoiced.map((j) => ({
        job_id: j.job_id,
        service_type: j.service_type,
        customer_id: j.customer_id,
        labor_cost: j.labor_cost,
        platform_fee: j.platform_fee,
        estimated_hours: j.estimated_hours,
        actual_hours: j.actual_hours,
        completed_at: j.completed_at,
      })),
      recent_decisions: recentDecisions,
    };
  }

  async preHook(action: ActionRequest): Promise<PreHookResult> {
    const input = action.tool_input as Record<string, unknown>;

    // Never authorize payment — that's human only
    if (action.tool_name === 'authorize_payment') {
      return { allowed: false, reason: 'Payment authorization requires human proxy approval.' };
    }

    // Flag any dispute calculation that might exceed the threshold
    if (
      action.tool_name === 'generate_invoice' &&
      typeof input['override_amount'] === 'number' &&
      (input['override_amount'] as number) > DISPUTE_ESCALATION_THRESHOLD
    ) {
      return {
        allowed: false,
        reason: `Invoice override >SEK ${DISPUTE_ESCALATION_THRESHOLD} requires human proxy review.`,
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
      case 'generate_invoice': {
        output = await generateInvoice(company, input['job_id'] as string);
        world_model_update = {
          invoice_generated: input['job_id'],
          generated_at: new Date().toISOString(),
        };
        break;
      }

      case 'calculate_rut_deduction': {
        const rut = await calculateRutDeduction(
          company,
          input['labor_cost'] as number,
          input['customer_id'] as string,
        );
        output = JSON.stringify(rut, null, 2);
        world_model_update = {};
        break;
      }

      case 'track_job_margin': {
        output = await trackJobMargin(company, input['job_id'] as string);
        world_model_update = { margin_tracked: input['job_id'] };
        break;
      }

      case 'flag_cost_anomaly': {
        output = await flagCostAnomaly(company, input['job_id'] as string);
        world_model_update = { anomaly_checked: input['job_id'] };
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
    // Derive a concise decision description for the log
    let decision = `executed ${result.tool_name}`;
    let reasoning = `Finance agent tool call for ${this.company_name}`;

    if (result.tool_name === 'generate_invoice') {
      try {
        const parsed = JSON.parse(result.output) as {
          invoice_id?: string;
          net_customer_payment?: number;
          rut_reasoning?: string;
        };
        decision = `Invoice ${parsed.invoice_id ?? ''}: net ${parsed.net_customer_payment ?? 0}`;
        reasoning = parsed.rut_reasoning ?? reasoning;
      } catch { /* non-JSON output — leave defaults */ }
    }

    await this.logger.log({
      session_id,
      agent: this.getAgentName(),
      decision_type: result.tool_name,
      input_signal: `company: ${this.company_name}`,
      decision,
      reasoning,
      output: result.output.slice(0, 500),
      world_model_update: result.world_model_update,
    });

    // Update finance goals when invoices are generated
    if (result.tool_name === 'generate_invoice' && context.goals.length > 0) {
      const completedJobs = await this.wm.jobs.find({ status: 'completed' });
      const invoiced = completedJobs.filter((j) => j.net_customer_payment > 0);
      const revenueGoal = context.goals.find((g) =>
        g.metric.name.toLowerCase().includes('revenue') ||
        g.metric.name.toLowerCase().includes('mrr'),
      );
      if (revenueGoal) {
        const totalRevenue = invoiced.reduce((s, j) => s + j.net_customer_payment, 0);
        const pct = Math.min(
          100,
          Math.round((totalRevenue / revenueGoal.metric.target_value) * 100),
        );
        await this.wm.goals.updateProgress(revenueGoal.goal_id, totalRevenue, pct);
      }
    }
  }
}
