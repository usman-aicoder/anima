import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { connect } from '@anima/core';
import { startHttpServer } from '../shared/http-server.js';

function createServer(): Server {
  const server = new Server(
    { name: 'anima-finance-agent', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
  return server;
}

export async function startServer(
  transport: 'stdio' | 'http',
  _company_name: string,
): Promise<void> {
  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI env var is required');
  await connect(mongoUri);

  const server = createServer();

  if (transport === 'stdio') {
    const t = new StdioServerTransport();
    await server.connect(t);
    return;
  }

  const port = parseInt(process.env['FINANCE_AGENT_PORT'] ?? '3013', 10);
  startHttpServer(server, port);
}
