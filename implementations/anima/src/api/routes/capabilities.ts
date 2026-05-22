import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function capabilitiesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/capabilities', async () => {
    return cacheGet('anima:capabilities:all', CACHE_TTL, () =>
      WorldModelClient.capabilities.find(),
    );
  });

  app.put('/capabilities', async (req, reply) => {
    const { service_type, geography, ...data } = req.body as Record<string, unknown>;
    const updated = await WorldModelClient.capabilities.upsert(
      service_type as string,
      geography as string,
      data as never,
    );
    await cacheInvalidate('anima:capabilities:all');
    return reply.code(200).send(updated);
  });
}
