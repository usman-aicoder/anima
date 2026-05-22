import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const FINANCE_TOOLS: Tool[] = [
  {
    name: 'generate_invoice',
    description:
      'Generate an invoice for a completed job. Calculates RUT deduction if eligible, sets net_customer_payment, writes invoice document, and updates customer RUT usage and lifetime value.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        job_id: { type: 'string', description: 'Completed job to invoice.' },
      },
      required: ['company_name', 'job_id'],
    },
  },
  {
    name: 'calculate_rut_deduction',
    description:
      'Calculate the RUT deduction for a given labor cost and customer RUT usage. Returns deduction amount and reasoning. Does not write to the World Model.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        labor_cost: { type: 'number', description: 'Gross labor cost in local currency.' },
        customer_id: { type: 'string', description: 'Customer whose RUT eligibility to check.' },
      },
      required: ['company_name', 'labor_cost', 'customer_id'],
    },
  },
  {
    name: 'track_job_margin',
    description:
      'Record the margin for a completed job in company_wiki under finance.margin_by_service. Call after generate_invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        job_id: { type: 'string' },
      },
      required: ['company_name', 'job_id'],
    },
  },
  {
    name: 'flag_cost_anomaly',
    description:
      'Flag a job where actual hours exceeded estimated hours by more than 20%. Creates a quality_alert and escalation for human review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        job_id: { type: 'string' },
      },
      required: ['company_name', 'job_id'],
    },
  },
];
