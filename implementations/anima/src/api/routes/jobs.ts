import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function jobsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/jobs', async (req) => {
    const { status, customer_id, provider_id } = req.query as Record<string, string>;
    const key = `anima:jobs:${status ?? 'all'}:${customer_id ?? 'all'}`;
    return cacheGet(key, CACHE_TTL, () =>
      WorldModelClient.jobs.find({
        ...(status && { status: status as never }),
        ...(customer_id && { customer_id }),
        ...(provider_id && { provider_id }),
      }),
    );
  });

  app.get('/jobs/:job_id', async (req, reply) => {
    const { job_id } = req.params as { job_id: string };
    const job = await cacheGet(`anima:jobs:${job_id}`, CACHE_TTL, () =>
      WorldModelClient.jobs.findById(job_id),
    );
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    return job;
  });

  app.post('/jobs', async (req, reply) => {
    const job = await WorldModelClient.jobs.create(req.body as never);
    await cacheInvalidate('anima:jobs:all:all');
    return reply.code(201).send(job);
  });

  app.patch('/jobs/:job_id/assign', async (req, reply) => {
    const { job_id } = req.params as { job_id: string };
    const { provider_id } = req.body as { provider_id: string };
    const updated = await WorldModelClient.jobs.assign(job_id, provider_id);
    if (!updated) return reply.code(404).send({ error: 'Job not found' });
    await cacheInvalidate(`anima:jobs:${job_id}`, 'anima:jobs:all:all');
    return updated;
  });

  app.patch('/jobs/:job_id/complete', async (req, reply) => {
    const { job_id } = req.params as { job_id: string };
    const { actual_hours, quality_rating } = req.body as {
      actual_hours: number;
      quality_rating: number;
    };
    const updated = await WorldModelClient.jobs.complete(job_id, actual_hours, quality_rating);
    if (!updated) return reply.code(404).send({ error: 'Job not found' });
    await cacheInvalidate(`anima:jobs:${job_id}`, 'anima:jobs:all:all');
    return updated;
  });
}
