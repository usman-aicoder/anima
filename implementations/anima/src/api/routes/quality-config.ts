import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function qualityConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/quality-config/:agent', async (req, reply) => {
    const { agent } = req.params as { agent: string };
    const config = await cacheGet(`anima:quality-config:${agent}`, CACHE_TTL, () =>
      WorldModelClient.qualityConfig.findByAgent(agent as never),
    );
    if (!config) return reply.code(404).send({ error: 'Config not found' });
    return config;
  });

  app.patch('/quality-config/:agent', async (req, reply) => {
    const { agent } = req.params as { agent: string };
    const updated = await WorldModelClient.qualityConfig.update(agent as never, req.body as never);
    if (!updated) return reply.code(404).send({ error: 'Config not found' });
    await cacheInvalidate(`anima:quality-config:${agent}`);
    return updated;
  });

  app.post('/quality-config/seed', async (_, reply) => {
    await WorldModelClient.qualityConfig.seedDefaults();
    return reply.code(200).send({ message: 'Quality config seeded for all 5 agents' });
  });
}
