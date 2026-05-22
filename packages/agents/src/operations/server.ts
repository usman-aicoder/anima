import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { connect } from '@anima/core';
import { OPERATIONS_TOOLS } from './tools.js';
import { vetProvider } from './handlers/vet-provider.js';
import { assignJob } from './handlers/assign-job.js';
import { completeJob } from './handlers/complete-job.js';
import { updateProviderScore } from './handlers/update-provider-score.js';
import { flagQualityIssue } from './handlers/flag-quality-issue.js';

function createServer(company_name: string): Server {
  const server = new Server(
    { name: 'anima-operations-agent', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: OPERATIONS_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = (request.params.arguments ?? {}) as Record<string, unknown>;
    const company = (input['company_name'] as string | undefined) ?? company_name;

    let text: string;

    switch (request.params.name) {
      case 'vet_provider':
        text = await vetProvider(company, input['provider_id'] as string);
        break;
      case 'assign_job':
        text = await assignJob(company, input['job_id'] as string);
        break;
      case 'complete_job':
        text = await completeJob(
          company,
          input['job_id'] as string,
          input['actual_hours'] as number,
          input['quality_rating'] as number,
        );
        break;
      case 'update_provider_score':
        text = await updateProviderScore(
          company,
          input['provider_id'] as string,
          input['service_type'] as string,
        );
        break;
      case 'flag_quality_issue':
        text = await flagQualityIssue(
          company,
          input['provider_id'] as string,
          input['reason'] as string,
          input['severity'] as 'warning' | 'critical' | 'emergency',
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

  throw new Error('HTTP transport not yet implemented. Set ANIMA_TRANSPORT=stdio for local dev.');
}
