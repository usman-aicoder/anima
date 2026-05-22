import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const OPERATIONS_TOOLS: Tool[] = [
  {
    name: 'vet_provider',
    description:
      'Validate a provider profile against the vetting criteria in company_wiki.partner_requirements. Returns pass/fail per criterion with the failure_action to take.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        provider_id: { type: 'string', description: 'Provider to vet.' },
      },
      required: ['company_name', 'provider_id'],
    },
  },
  {
    name: 'assign_job',
    description:
      'Assign an open job to the best eligible provider. Scores all active providers by quality_score for the matching service_type and geography, assigns the top scorer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        job_id: { type: 'string', description: 'Job in status requested to assign.' },
      },
      required: ['company_name', 'job_id'],
    },
  },
  {
    name: 'complete_job',
    description:
      'Mark a job as completed. Records actual hours and quality rating. Triggers provider score update.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        job_id: { type: 'string' },
        actual_hours: { type: 'number', description: 'Hours actually worked.' },
        quality_rating: { type: 'number', description: '1-5 quality rating.' },
      },
      required: ['company_name', 'job_id', 'actual_hours', 'quality_rating'],
    },
  },
  {
    name: 'update_provider_score',
    description:
      'Recalculate and store a provider quality score for a given service_type, based on last 10 completed jobs. Call after every job completion.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        provider_id: { type: 'string' },
        service_type: { type: 'string' },
      },
      required: ['company_name', 'provider_id', 'service_type'],
    },
  },
  {
    name: 'flag_quality_issue',
    description:
      'Create a quality_alert for a provider after repeated below-threshold performance. Does NOT terminate the provider — that requires human approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        provider_id: { type: 'string' },
        reason: { type: 'string', description: 'Why this provider is being flagged.' },
        severity: {
          type: 'string',
          enum: ['warning', 'critical', 'emergency'],
        },
      },
      required: ['company_name', 'provider_id', 'reason', 'severity'],
    },
  },
];
