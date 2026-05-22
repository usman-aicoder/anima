import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tasks', async (req) => {
    const q = req.query as Record<string, string>;
    const key = `anima:tasks:${q['owner_agent'] ?? 'all'}:${q['status'] ?? 'all'}`;
    return cacheGet(key, CACHE_TTL, () =>
      WorldModelClient.tasks.find({
        ...(q['owner_agent'] && { owner_agent: q['owner_agent'] }),
        ...(q['status'] && { status: q['status'] as never }),
        ...(q['type'] && { type: q['type'] as never }),
      }),
    );
  });

  app.get('/tasks/:task_id', async (req, reply) => {
    const { task_id } = req.params as { task_id: string };
    const task = await cacheGet(`anima:tasks:${task_id}`, CACHE_TTL, () =>
      WorldModelClient.tasks.findById(task_id),
    );
    if (!task) return reply.code(404).send({ error: 'Task not found' });
    return task;
  });

  app.post('/tasks', async (req, reply) => {
    const task = await WorldModelClient.tasks.create(req.body as never);
    await cacheInvalidate('anima:tasks:all:all');
    return reply.code(201).send(task);
  });

  app.patch('/tasks/:task_id/status', async (req, reply) => {
    const { task_id } = req.params as { task_id: string };
    const { status } = req.body as { status: string };
    const updated = await WorldModelClient.tasks.updateStatus(task_id, status as never);
    if (!updated) return reply.code(404).send({ error: 'Task not found' });
    await cacheInvalidate(`anima:tasks:${task_id}`, 'anima:tasks:all:all');
    return updated;
  });

  app.patch('/tasks/:task_id/complete', async (req, reply) => {
    const { task_id } = req.params as { task_id: string };
    const { completed_by, evidence } = req.body as { completed_by: string; evidence: never[] };
    const updated = await WorldModelClient.tasks.complete(task_id, completed_by, evidence ?? []);
    if (!updated) return reply.code(404).send({ error: 'Task not found' });
    await cacheInvalidate(`anima:tasks:${task_id}`, 'anima:tasks:all:all');
    return updated;
  });
}
