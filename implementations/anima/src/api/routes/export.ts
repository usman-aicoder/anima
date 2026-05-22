import type { FastifyInstance } from 'fastify';
import { exportCompany, importCompany } from '@anima/core';
import type { CompanySnapshot } from '@anima/core';

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { company_name: string } }>(
    '/export/:company_name',
    async (request, reply) => {
      const snapshot = await exportCompany(request.params.company_name);
      return reply
        .header('Content-Disposition', `attachment; filename="${request.params.company_name}-snapshot.json"`)
        .send(snapshot);
    },
  );

  app.post<{ Body: CompanySnapshot }>(
    '/import',
    async (request, reply) => {
      const result = await importCompany(request.body);
      return reply.send(result);
    },
  );
}
