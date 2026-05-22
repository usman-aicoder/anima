import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient } from '@anima/core';

export async function flagQualityIssue(
  _company_name: string,
  provider_id: string,
  reason: string,
  severity: 'warning' | 'critical' | 'emergency',
): Promise<string> {
  const provider = await WorldModelClient.providers.findById(provider_id);
  if (!provider) return `Provider ${provider_id} not found.`;

  const alert = await WorldModelClient.qualityAlerts.create({
    alert_id: uuidv4(),
    agent: 'operations',
    alert_type: 'unusual_decision',
    severity,
    threshold_value: 6,
    actual_value: 0,
    message: `Provider ${provider.company_name} (${provider_id}) flagged: ${reason}`,
    resolved: false,
    resolved_at: null,
    created_at: new Date(),
  });

  return JSON.stringify({
    alert_id: alert.alert_id,
    provider_id,
    provider_name: provider.company_name,
    severity,
    reason,
    note: 'Human proxy must decide whether to terminate or retain this provider.',
  });
}
