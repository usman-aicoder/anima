import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function escalationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/escalations/pending', async () => {
    return cacheGet('anima:escalations:pending', CACHE_TTL, () =>
      WorldModelClient.escalations.findPending(),
    );
  });

  app.post('/escalations', async (req, reply) => {
    const escalation = await WorldModelClient.escalations.create(req.body as never);
    await cacheInvalidate('anima:escalations:pending');
    return reply.code(201).send(escalation);
  });

  app.patch('/escalations/:escalation_id/decide', async (req, reply) => {
    const { escalation_id } = req.params as { escalation_id: string };
    const { decision, decision_by, decision_reason } = req.body as {
      decision: 'approved' | 'rejected';
      decision_by: string;
      decision_reason: string;
    };
    const updated = await WorldModelClient.escalations.decide(
      escalation_id,
      decision,
      decision_by,
      decision_reason,
    );
    if (!updated) return reply.code(404).send({ error: 'Escalation not found' });
    await cacheInvalidate('anima:escalations:pending');
    return updated;
  });
}
