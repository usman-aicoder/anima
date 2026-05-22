import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { connect } from '@anima/core';
import { startHttpServer } from '../shared/http-server.js';
import { runIntake } from './intake.js';
import { buildGoalTree } from './goal-tree-builder.js';
import { generateHumanTasks } from './human-task-generator.js';
import { INTAKE_QUESTIONS } from './types.js';

const STRATEGY_TOOLS = [
  { name: 'run_onboarding', description: 'Run the 10-question intake interview.', input_schema: { type: 'object' as const, properties: { company_name: { type: 'string' }, answers: { type: 'array', items: { type: 'object' } } }, required: ['company_name', 'answers'] } },
  { name: 'build_goal_tree', description: 'Build goal tree from onboarding facts.', input_schema: { type: 'object' as const, properties: { company_name: { type: 'string' }, business_type: { type: 'string' }, market: { type: 'string' }, primary_challenge: { type: 'string' }, monthly_budget: { type: 'number' }, success_1m: { type: 'string' }, success_3m: { type: 'string' } }, required: ['company_name', 'business_type', 'market', 'primary_challenge', 'monthly_budget', 'success_1m', 'success_3m'] } },
  { name: 'get_intake_questions', description: 'Return the 10 intake questions.', input_schema: { type: 'object' as const, properties: {} } },
];

function createServer(company_name: string): Server {
  const server = new Server(
    { name: 'anima-strategy-agent', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: STRATEGY_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = (request.params.arguments ?? {}) as Record<string, unknown>;
    const company = (input['company_name'] as string | undefined) ?? company_name;
    let text: string;

    switch (request.params.name) {
      case 'run_onboarding': {
        const result = await runIntake(input['answers'] as Parameters<typeof runIntake>[0]);
        text = JSON.stringify({ company_name: result.company_name, facts_written: result.facts_written.length });
        break;
      }
      case 'build_goal_tree': {
        const result = await buildGoalTree({
          company_name: company,
          business_type: input['business_type'] as string,
          market: input['market'] as string,
          primary_challenge: input['primary_challenge'] as string,
          monthly_budget: input['monthly_budget'] as number,
          success_1m: input['success_1m'] as string,
          success_3m: input['success_3m'] as string,
        });
        text = JSON.stringify(result);
        break;
      }
      case 'get_intake_questions':
        text = JSON.stringify(INTAKE_QUESTIONS);
        break;
      default:
        text = `Unknown tool: ${request.params.name}`;
    }

    return { content: [{ type: 'text' as const, text }] };
  });

  return server;
}

export async function startServer(
  transport: 'stdio' | 'http',
  company_name: string,
): Promise<void> {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI env var is required');
  await connect(mongoUri);

  const server = createServer(company_name);

  if (transport === 'stdio') {
    const t = new StdioServerTransport();
    await server.connect(t);
    return;
  }

  const port = parseInt(process.env['STRATEGY_AGENT_PORT'] ?? '3011', 10);
  startHttpServer(server, port);
}
