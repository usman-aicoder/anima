import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// Starts an HTTP/SSE MCP server on the given port.
// GET /sse  → opens an SSE stream; client must connect here first
// POST /messages?sessionId=<id>  → client sends JSON-RPC messages here
export function startHttpServer(mcpServer: Server, port: number): void {
  const app = express();
  const transports: SSEServerTransport[] = [];

  app.use(express.json());

  app.get('/sse', (_req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    transports.push(transport);
    void mcpServer.connect(transport);
    _req.on('close', () => {
      const idx = transports.indexOf(transport);
      if (idx !== -1) transports.splice(idx, 1);
    });
  });

  app.post('/messages', async (req, res) => {
    const sessionId = req.query['sessionId'] as string | undefined;
    const transport = transports.find((t) => t.sessionId === sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', connections: transports.length });
  });

  app.listen(port, () => {
    console.log(`[mcp-http] Listening on port ${port} (SSE at /sse, messages at /messages)`);
  });
}
