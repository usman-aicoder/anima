import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const QUALITY_TOOLS: Tool[] = [
  {
    name: 'run_threshold_checks',
    description:
      'Check all 5 agents against their quality_config thresholds. Creates a quality_alert for every breach found. Returns a summary of all checks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'check_goal_health',
    description:
      'Apply the at-risk formula to all active goals. Creates quality_alerts for goals that are behind trajectory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'escalate_quality_issue',
    description:
      'Create an escalation record for a critical or emergency quality alert. Use when a threshold breach requires human proxy decision.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string' },
        alert_id: { type: 'string', description: 'The quality_alert to escalate.' },
        recommended_action: { type: 'string', description: 'What the human proxy should do.' },
      },
      required: ['company_name', 'alert_id', 'recommended_action'],
    },
  },
];
