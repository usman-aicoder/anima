import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { connect } from '@anima/core';
import { GROWTH_TOOLS } from './tools.js';
import { checkRankings } from './handlers/check-rankings.js';
import { generateSeoContent } from './handlers/generate-seo-content.js';
import { publishPage } from './handlers/publish-page.js';
import { scheduleSocialPost } from './handlers/schedule-social-post.js';

function createServer(company_name: string): Server {
  const server = new Server(
    { name: 'anima-growth-agent', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: GROWTH_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = (request.params.arguments ?? {}) as Record<string, string>;
    const company = input['company_name'] ?? company_name;

    let text: string;

    switch (request.params.name) {
      case 'check_rankings':
        text = await checkRankings(company);
        break;
      case 'generate_seo_content':
        text = await generateSeoContent(
          company,
          input['keyword'] ?? '',
          input['target_url'] ?? '',
        );
        break;
      case 'publish_page':
        text = await publishPage(
          company,
          input['target_url'] ?? '',
          input['title'] ?? '',
          input['meta_description'] ?? '',
          input['content'] ?? '',
        );
        break;
      case 'schedule_social_post':
        text = await scheduleSocialPost(company, input['content'] ?? '', input['linked_url']);
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

  // HTTP/SSE transport — persistent server for Railway production.
  // Full HTTP wiring (express + SSEServerTransport) added in Sprint 6 full harness.
  throw new Error('HTTP transport not yet implemented. Set ANIMA_TRANSPORT=stdio for local dev.');
}
