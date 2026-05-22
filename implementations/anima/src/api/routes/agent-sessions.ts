import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, CACHE_TTL } from '../cache/redis.js';

export async function agentSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/agent-sessions/:session_id', async (req, reply) => {
    const { session_id } = req.params as { session_id: string };
    const session = await cacheGet(`anima:sessions:${session_id}`, CACHE_TTL, () =>
      WorldModelClient.agentSessions.findById(session_id),
    );
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    return session;
  });

  app.get('/agent-sessions/crashed/:agent', async (req) => {
    const { agent } = req.params as { agent: string };
    return WorldModelClient.agentSessions.findCrashed(agent);
  });
}
