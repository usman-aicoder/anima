import type { FastifyInstance } from 'fastify';
import { goalsRoutes } from './goals.js';
import { tasksRoutes } from './tasks.js';
import { agentDecisionsRoutes } from './agent-decisions.js';
import { agentSessionsRoutes } from './agent-sessions.js';
import { providersRoutes } from './providers.js';
import { capabilitiesRoutes } from './capabilities.js';
import { customersRoutes } from './customers.js';
import { jobsRoutes } from './jobs.js';
import { companyWikiRoutes } from './company-wiki.js';
import { documentsRoutes } from './documents.js';
import { escalationsRoutes } from './escalations.js';
import { qualityAlertsRoutes } from './quality-alerts.js';
import { qualityConfigRoutes } from './quality-config.js';
import { exportRoutes } from './export.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(goalsRoutes);
  await app.register(tasksRoutes);
  await app.register(agentDecisionsRoutes);
  await app.register(agentSessionsRoutes);
  await app.register(providersRoutes);
  await app.register(capabilitiesRoutes);
  await app.register(customersRoutes);
  await app.register(jobsRoutes);
  await app.register(companyWikiRoutes);
  await app.register(documentsRoutes);
  await app.register(escalationsRoutes);
  await app.register(qualityAlertsRoutes);
  await app.register(qualityConfigRoutes);
  await app.register(exportRoutes);
}
