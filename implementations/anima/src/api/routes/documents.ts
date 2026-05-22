import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, CACHE_TTL } from '../cache/redis.js';

export async function documentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/documents/:document_id', async (req, reply) => {
    const { document_id } = req.params as { document_id: string };
    const doc = await cacheGet(`anima:documents:${document_id}`, CACHE_TTL, () =>
      WorldModelClient.documents.findById(document_id),
    );
    if (!doc) return reply.code(404).send({ error: 'Document not found' });
    return doc;
  });

  app.get('/documents', async (req) => {
    const { tags } = req.query as { tags?: string };
    const tagList = tags ? tags.split(',').map((t) => t.trim()) : [];
    return WorldModelClient.documents.findByTags(tagList);
  });

  app.post('/documents', async (req, reply) => {
    const doc = await WorldModelClient.documents.create(req.body as never);
    return reply.code(201).send(doc);
  });
}
