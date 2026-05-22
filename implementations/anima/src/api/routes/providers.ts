import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function providersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/providers', async (req) => {
    const { status, active } = req.query as Record<string, string>;
    const key = `anima:providers:${status ?? 'all'}:${active ?? 'all'}`;
    return cacheGet(key, CACHE_TTL, () =>
      WorldModelClient.providers.find({
        ...(status && { status: status as never }),
        ...(active !== undefined && { active: active === 'true' }),
      }),
    );
  });

  app.get('/providers/:provider_id', async (req, reply) => {
    const { provider_id } = req.params as { provider_id: string };
    const provider = await cacheGet(`anima:providers:${provider_id}`, CACHE_TTL, () =>
      WorldModelClient.providers.findById(provider_id),
    );
    if (!provider) return reply.code(404).send({ error: 'Provider not found' });
    return provider;
  });

  app.post('/providers', async (req, reply) => {
    const provider = await WorldModelClient.providers.create(req.body as never);
    await cacheInvalidate('anima:providers:all:all');
    return reply.code(201).send(provider);
  });

  app.patch('/providers/:provider_id/status', async (req, reply) => {
    const { provider_id } = req.params as { provider_id: string };
    const { status } = req.body as { status: string };
    const updated = await WorldModelClient.providers.updateStatus(provider_id, status as never);
    if (!updated) return reply.code(404).send({ error: 'Provider not found' });
    await cacheInvalidate(`anima:providers:${provider_id}`, 'anima:providers:all:all');
    return updated;
  });
}
