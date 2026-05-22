import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function goalsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/goals', async (req) => {
    const { owner_agent, status } = req.query as Record<string, string>;
    const key = `anima:goals:${owner_agent ?? 'all'}:${status ?? 'all'}`;
    return cacheGet(key, CACHE_TTL, () => {
      if (status === 'at_risk') return WorldModelClient.goals.findAtRisk();
      if (status === 'active') return WorldModelClient.goals.findActive(owner_agent as never);
      // No status filter (dashboard) — return all goals
      return WorldModelClient.goals.findAll(owner_agent as never);
    });
  });

  app.get('/goals/:goal_id', async (req, reply) => {
    const { goal_id } = req.params as { goal_id: string };
    const goal = await cacheGet(`anima:goals:${goal_id}`, CACHE_TTL, () =>
      WorldModelClient.goals.findById(goal_id),
    );
    if (!goal) return reply.code(404).send({ error: 'Goal not found' });
    return goal;
  });

  app.post('/goals', async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const goal = await WorldModelClient.goals.create(body as never);
    await cacheInvalidate('anima:goals:all:all');
    return reply.code(201).send(goal);
  });

  app.patch('/goals/:goal_id/status', async (req, reply) => {
    const { goal_id } = req.params as { goal_id: string };
    const { status } = req.body as { status: string };
    const updated = await WorldModelClient.goals.updateStatus(goal_id, status as never);
    if (!updated) return reply.code(404).send({ error: 'Goal not found' });
    await cacheInvalidate(`anima:goals:${goal_id}`, 'anima:goals:all:all');
    return updated;
  });

  app.patch('/goals/:goal_id/approve', async (req, reply) => {
    const { goal_id } = req.params as { goal_id: string };
    const { approved_by } = req.body as { approved_by: string };
    const updated = await WorldModelClient.goals.approve(goal_id, approved_by ?? 'human_proxy');
    if (!updated) return reply.code(404).send({ error: 'Goal not found' });
    await cacheInvalidate(`anima:goals:${goal_id}`, 'anima:goals:all:all');
    return updated;
  });
}
