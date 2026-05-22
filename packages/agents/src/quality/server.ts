import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { connect } from '@anima/core';
import { startHttpServer } from '../shared/http-server.js';
import { QUALITY_TOOLS } from './tools.js';
import { runThresholdChecks } from './handlers/run-threshold-checks.js';
import { checkGoalHealth } from './handlers/check-goal-health.js';
import { escalateQualityIssue } from './handlers/escalate-quality-issue.js';

function createServer(company_name: string): Server {
  const server = new Server(
    { name: 'anima-quality-agent', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: QUALITY_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = (request.params.arguments ?? {}) as Record<string, unknown>;
    const company = (input['company_name'] as string | undefined) ?? company_name;

    let text: string;

    switch (request.params.name) {
      case 'run_threshold_checks':
        text = await runThresholdChecks(company);
        break;
      case 'check_goal_health':
        text = await checkGoalHealth(company);
        break;
      case 'escalate_quality_issue':
        text = await escalateQualityIssue(
          company,
          input['alert_id'] as string,
          input['recommended_action'] as string,
        );
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

  const port = parseInt(process.env['QUALITY_AGENT_PORT'] ?? '3014', 10);
  startHttpServer(server, port);
}
