import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, CACHE_TTL } from '../cache/redis.js';

const ALL_AGENTS = ['growth', 'operations', 'finance', 'strategy', 'quality'] as const;

export async function agentDecisionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/agent-decisions', async (req) => {
    const { agent, limit } = req.query as Record<string, string>;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    if (agent) {
      const key = `anima:decisions:${agent}:${parsedLimit}`;
      return cacheGet(key, CACHE_TTL, () =>
        WorldModelClient.agentDecisions.findRecent(agent as never, parsedLimit),
      );
    }

    // No agent specified — fetch across all agents, merge and sort by created_at desc
    const key = `anima:decisions:all:${parsedLimit}`;
    return cacheGet(key, CACHE_TTL, async () => {
      const perAgent = Math.ceil(parsedLimit / ALL_AGENTS.length) + 5;
      const chunks = await Promise.all(
        ALL_AGENTS.map((a) => WorldModelClient.agentDecisions.findRecent(a, perAgent)),
      );
      const merged = chunks.flat().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return merged.slice(0, parsedLimit);
    });
  });

  app.get('/agent-decisions/session/:session_id', async (req) => {
    const { session_id } = req.params as { session_id: string };
    return cacheGet(`anima:decisions:session:${session_id}`, CACHE_TTL, () =>
      WorldModelClient.agentDecisions.findBySession(session_id),
    );
  });
}
