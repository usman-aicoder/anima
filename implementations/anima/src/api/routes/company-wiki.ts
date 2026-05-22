import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function companyWikiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/company-wiki/:company_name', async (req) => {
    const { company_name } = req.params as { company_name: string };
    const name = decodeURIComponent(company_name);
    return cacheGet(`anima:wiki:${name}`, CACHE_TTL, () =>
      WorldModelClient.companyWiki.getAll(name),
    );
  });

  app.get('/company-wiki/:company_name/:category/:key', async (req, reply) => {
    const { company_name, category, key } = req.params as { company_name: string; category: string; key: string };
    const entry = await WorldModelClient.companyWiki.get(
      decodeURIComponent(company_name),
      category,
      key,
    );
    if (!entry) return reply.code(404).send({ error: 'Wiki entry not found' });
    return entry;
  });

  app.post('/company-wiki', async (req, reply) => {
    const { company_name, category, key, value, updated_by } = req.body as Record<string, unknown>;
    const entry = await WorldModelClient.companyWiki.set(
      company_name as string,
      category as string,
      key as string,
      value,
      (updated_by as string) ?? 'api',
    );
    await cacheInvalidate(`anima:wiki:${company_name}`);
    return reply.code(200).send(entry);
  });
}
