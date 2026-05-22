import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function qualityAlertsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/quality-alerts', async (req) => {
    const { agent } = req.query as { agent?: string };
    const key = `anima:quality-alerts:${agent ?? 'all'}`;
    return cacheGet(key, CACHE_TTL, () =>
      WorldModelClient.qualityAlerts.findUnresolved(agent),
    );
  });

  app.post('/quality-alerts', async (req, reply) => {
    const alert = await WorldModelClient.qualityAlerts.create(req.body as never);
    await cacheInvalidate('anima:quality-alerts:all');
    return reply.code(201).send(alert);
  });

  app.patch('/quality-alerts/:alert_id/resolve', async (req, reply) => {
    const { alert_id } = req.params as { alert_id: string };
    const updated = await WorldModelClient.qualityAlerts.resolve(alert_id);
    if (!updated) return reply.code(404).send({ error: 'Alert not found' });
    await cacheInvalidate('anima:quality-alerts:all');
    return updated;
  });
}
