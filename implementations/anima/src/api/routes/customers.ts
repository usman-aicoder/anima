import type { FastifyInstance } from 'fastify';
import { WorldModelClient } from '@anima/core';
import { cacheGet, cacheInvalidate, CACHE_TTL } from '../cache/redis.js';

export async function customersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/customers/:customer_id', async (req, reply) => {
    const { customer_id } = req.params as { customer_id: string };
    const customer = await cacheGet(`anima:customers:${customer_id}`, CACHE_TTL, () =>
      WorldModelClient.customers.findById(customer_id),
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });
    return customer;
  });

  app.get('/customers/email/:email', async (req, reply) => {
    const { email } = req.params as { email: string };
    const customer = await WorldModelClient.customers.findByEmail(
      decodeURIComponent(email),
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });
    return customer;
  });

  app.post('/customers', async (req, reply) => {
    const customer = await WorldModelClient.customers.create(req.body as never);
    await cacheInvalidate('anima:customers:all');
    return reply.code(201).send(customer);
  });
}
