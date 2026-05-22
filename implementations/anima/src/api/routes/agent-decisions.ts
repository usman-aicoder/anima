import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, CACHE_TTL } from '../cache/redis.js';

export async function agentDecisionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/agent-decisions', async (req) => {
    const { agent, limit } = req.query as Record<string, string>;
    if (!agent) return { error: 'agent query param required' };
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const key = `anima:decisions:${agent}:${parsedLimit}`;
    return cacheGet(key, CACHE_TTL, () =>
      WorldModelClient.agentDecisions.findRecent(agent as never, parsedLimit),
    );
  });

  app.get('/agent-decisions/session/:session_id', async (req) => {
    const { session_id } = req.params as { session_id: string };
    return cacheGet(`anima:decisions:session:${session_id}`, CACHE_TTL, () =>
      WorldModelClient.agentDecisions.findBySession(session_id),
    );
  });
}
