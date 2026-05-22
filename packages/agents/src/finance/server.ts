import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { connect } from '@anima/core';
import { startHttpServer } from '../shared/http-server.js';
import { FINANCE_TOOLS } from './tools.js';
import { generateInvoice } from './handlers/generate-invoice.js';
import { calculateRutDeduction } from './handlers/calculate-rut-deduction.js';
import { trackJobMargin } from './handlers/track-job-margin.js';
import { flagCostAnomaly } from './handlers/flag-cost-anomaly.js';

function createServer(company_name: string): Server {
  const server = new Server(
    { name: 'anima-finance-agent', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: FINANCE_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = (request.params.arguments ?? {}) as Record<string, unknown>;
    const company = (input['company_name'] as string | undefined) ?? company_name;
    let text: string;

    switch (request.params.name) {
      case 'generate_invoice':
        text = await generateInvoice(company, input['job_id'] as string);
        break;
      case 'calculate_rut_deduction': {
        const rut = await calculateRutDeduction(
          company,
          input['labor_cost'] as number,
          input['customer_id'] as string,
        );
        text = JSON.stringify(rut, null, 2);
        break;
      }
      case 'track_job_margin':
        text = await trackJobMargin(company, input['job_id'] as string);
        break;
      case 'flag_cost_anomaly':
        text = await flagCostAnomaly(company, input['job_id'] as string);
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

  const port = parseInt(process.env['FINANCE_AGENT_PORT'] ?? '3013', 10);
  startHttpServer(server, port);
}
