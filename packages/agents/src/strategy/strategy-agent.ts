import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { BaseAgent, type AgentContext, type ActionRequest, type ActionResult, type PreHookResult } from '@anima/core';
import { WorldModelClient } from '@anima/core';
import { runIntake } from './intake.js';
import { buildGoalTree } from './goal-tree-builder.js';
import { generateHumanTasks } from './human-task-generator.js';
import type { IntakeAnswer, GoalTreeInput } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STRATEGY_TOOLS: Tool[] = [
  {
    name: 'run_onboarding',
    description: 'Run the 10-question intake interview for a company, extract structured facts into company_wiki, and return the onboarding result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string', description: 'Company name' },
        answers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question_id: { type: 'number' },
              question: { type: 'string' },
              answer: { type: 'string' },
            },
            required: ['question_id', 'question', 'answer'],
          },
          description: 'Array of intake answers',
        },
      },
      required: ['company_name', 'answers'],
    },
  },
  {
    name: 'build_goal_tree',
    description: 'Build the initial goal tree for a company from its onboarding facts and store goals in MongoDB as drafts for human approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        business_type: { type: 'string' },
        market: { type: 'string' },
        primary_challenge: { type: 'string' },
        monthly_budget: { type: 'number' },
        success_1m: { type: 'string' },
        success_3m: { type: 'string' },
      },
      required: ['company_name', 'business_type', 'market', 'primary_challenge', 'monthly_budget', 'success_1m', 'success_3m'],
    },
  },
  {
    name: 'generate_human_tasks',
    description: 'Generate a prioritised list of human-only tasks (register company, open bank account, purchase domain, etc.) based on onboarding facts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'generate_weekly_brief',
    description: 'Generate the Friday weekly brief: progress per goal, pending escalations, completed milestones, 3 recommended focus areas. Writes to documents collection.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'dispatch_mission',
    description: 'Dispatch a mission to another agent by writing a task to the tasks collection with the target agent as owner.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        target_agent: {
          type: 'string',
          enum: ['growth', 'operations', 'finance', 'quality'],
        },
        mission: { type: 'string', description: 'Mission description' },
        goal_id: { type: 'string', description: 'Goal this mission serves' },
        priority: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
        },
      },
      required: ['company_name', 'target_agent', 'mission', 'priority'],
    },
  },
];

export class StrategyAgent extends BaseAgent {
  private readonly company_name: string;
  private readonly staticPrompt: string;

  constructor(company_name: string) {
    super();
    this.company_name = company_name;
    this.staticPrompt = readFileSync(join(__dirname, 'AGENTS.md'), 'utf-8');
  }

  getAgentName() {
    return 'strategy' as const;
  }

  getIterationCap() {
    return 20;
  }

  getTools() {
    return STRATEGY_TOOLS;
  }

  getStaticPrompt() {
    return this.staticPrompt;
  }

  async assembleContext(): Promise<AgentContext> {
    const [goals, recentDecisions, wikiEntries] = await Promise.all([
      this.wm.goals.findActive('strategy'),
      this.wm.agentDecisions.findRecent('strategy', 20),
      this.wm.companyWiki.getAll(this.company_name),
    ]);

    const company_wiki: Record<string, unknown> = {};
    for (const entry of wikiEntries) {
      const k = `${entry.category}.${entry.key}`;
      company_wiki[k] = entry.value;
    }

    return {
      company_name: this.company_name,
      goals,
      company_wiki,
      recent_decisions: recentDecisions,
    };
  }

  async preHook(action: ActionRequest): Promise<PreHookResult> {
    // Goal activation requires human proxy — strategy agent only creates drafts
    if (action.tool_name === 'build_goal_tree') {
      // Allowed — creates drafts, not active goals
      return { allowed: true };
    }
    return { allowed: true };
  }

  async executeTool(action: ActionRequest, _context: AgentContext): Promise<ActionResult> {
    const input = action.tool_input;

    switch (action.tool_name) {
      case 'run_onboarding': {
        const result = await runIntake(input['answers'] as IntakeAnswer[]);
        return {
          tool_name: action.tool_name,
          output: JSON.stringify({
            company_name: result.company_name,
            facts_written: result.facts_written.length,
          }),
          world_model_update: { company_wiki: `${result.facts_written.length} facts written` },
        };
      }

      case 'build_goal_tree': {
        const treeInput: GoalTreeInput = {
          company_name: input['company_name'] as string,
          business_type: input['business_type'] as string,
          market: input['market'] as string,
          primary_challenge: input['primary_challenge'] as string,
          monthly_budget: input['monthly_budget'] as number,
          success_1m: input['success_1m'] as string,
          success_3m: input['success_3m'] as string,
        };
        const result = await buildGoalTree(treeInput);
        return {
          tool_name: action.tool_name,
          output: JSON.stringify(result),
          world_model_update: { goals: `${result.goals_created} draft goals created` },
        };
      }

      case 'generate_human_tasks': {
        const companyName = input['company_name'] as string;
        const wiki = await this.wm.companyWiki.getAll(companyName);
        const fakeOnboarding = {
          company_name: companyName,
          answers: [],
          facts_written: wiki.map((e) => ({
            category: e.category,
            key: e.key,
            value: e.value,
          })),
          documents_ingested: 0,
          goal_tree_created: false,
          human_tasks_created: 0,
        };
        const result = await generateHumanTasks(companyName, fakeOnboarding);
        return {
          tool_name: action.tool_name,
          output: JSON.stringify(result),
          world_model_update: { tasks: `${result.tasks_created} human tasks created` },
        };
      }

      case 'generate_weekly_brief': {
        const companyName = input['company_name'] as string;
        const [goals, decisions, escalations] = await Promise.all([
          this.wm.goals.findActive(),
          this.wm.agentDecisions.findRecent('strategy', 50),
          this.wm.escalations.findPending(),
        ]);

        const brief = [
          `# Weekly Strategy Brief — ${new Date().toISOString().split('T')[0]}`,
          `## Company: ${companyName}`,
          '',
          `## Active Goals (${goals.length})`,
          ...goals.map((g) => `- ${g.title}: ${g.progress.pct}% (${g.status})`),
          '',
          `## Pending Escalations (${escalations.length})`,
          ...escalations.map((e) => `- ${e.title}`),
          '',
          `## Recent Decisions (${decisions.length} in last 50)`,
          ...decisions.slice(0, 5).map((d) => `- [${d.agent}] ${d.decision_type}: ${d.decision}`),
        ].join('\n');

        await this.wm.documents.create({
          title: `Weekly Brief ${new Date().toISOString().split('T')[0]}`,
          type: 'brief',
          content_text: brief,
          tags: [companyName.toLowerCase().replace(/\s+/g, '-'), 'weekly-brief'],
          uploaded_by: 'strategy-agent',
          vector_embedding: [],
        });

        return {
          tool_name: action.tool_name,
          output: brief,
          world_model_update: { documents: 'weekly brief written' },
        };
      }

      case 'dispatch_mission': {
        const now = new Date();
        const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const goalId = input['goal_id'] as string | undefined;
        const task = await this.wm.tasks.create({
          task_id: uuidv4(),
          type: 'agent',
          ...(goalId !== undefined ? { parent_goal_id: goalId } : {}),
          title: input['mission'] as string,
          description: input['mission'] as string,
          owner_agent: input['target_agent'] as string,
          status: 'pending',
          priority: input['priority'] as 'critical' | 'high' | 'medium' | 'low',
          due_date: due,
          blocked_by: [],
          completion: { completed_at: null, completed_by: '', evidence: [] },
          created_by: 'strategy-agent',
          created_at: now,
        });
        return {
          tool_name: action.tool_name,
          output: `Mission dispatched to ${input['target_agent'] as string}: task_id=${task.task_id}`,
          world_model_update: { tasks: `mission dispatched to ${input['target_agent'] as string}` },
        };
      }

      default:
        return {
          tool_name: action.tool_name,
          output: `Unknown tool: ${action.tool_name}`,
          world_model_update: {},
        };
    }
  }

  async postHook(result: ActionResult, session_id: string, context: AgentContext): Promise<void> {
    await this.logger.log({
      session_id,
      agent: this.getAgentName(),
      decision_type: result.tool_name,
      input_signal: `company: ${this.company_name}`,
      decision: result.output.slice(0, 200),
      reasoning: `Strategy agent executed ${result.tool_name}`,
      output: result.output,
      world_model_update: result.world_model_update,
      escalated_to_human: false,
      token_usage: { input_tokens: 0, output_tokens: 0, cost_sek: 0 },
    });

    // Update active goals progress tracking context
    void context;
  }
}
