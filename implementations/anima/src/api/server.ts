import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { connect } from '@anima/core';
import { registerRoutes } from './routes/index.js';

export async function buildServer() {
  const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } });

  await app.register(cors, { origin: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Anima World Model API',
        description: 'REST interface for all 13 World Model collections',
        version: '0.1.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await registerRoutes(app);

  return app;
}

export async function startServer(): Promise<void> {
  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI is required');

  await connect(uri);

  const app = await buildServer();
  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`World Model API running on http://${host}:${port}`);
  app.log.info(`OpenAPI docs at http://${host}:${port}/docs`);
}
