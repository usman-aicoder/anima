import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient } from '@anima/core';

export async function escalateQualityIssue(
  _company_name: string,
  alert_id: string,
  recommended_action: string,
): Promise<string> {
  const alerts = await WorldModelClient.qualityAlerts.findUnresolved();
  const alert = alerts.find((a) => a.alert_id === alert_id);

  if (!alert) {
    return `Quality alert ${alert_id} not found or already resolved.`;
  }

  if (alert.severity === 'warning') {
    return `Alert ${alert_id} is severity 'warning' — does not require escalation. Handle autonomously.`;
  }

  const now = new Date();
  const expiryHours = alert.severity === 'emergency' ? 24 : 72;
  const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

  const escalation = await WorldModelClient.escalations.create({
    escalation_id: uuidv4(),
    agent: 'quality',
    type: alert.alert_type,
    title: `[${alert.severity.toUpperCase()}] ${alert.message}`,
    context: {
      alert_id: alert.alert_id,
      agent: alert.agent,
      alert_type: alert.alert_type,
      threshold_value: alert.threshold_value,
      actual_value: alert.actual_value,
      detected_at: alert.created_at,
    },
    recommended_action,
    status: 'pending',
    decision_by: null,
    decision_reason: null,
    decided_at: null,
    created_at: now,
    expires_at: expiresAt,
  });

  return JSON.stringify({
    escalation_id: escalation.escalation_id,
    alert_id,
    severity: alert.severity,
    title: escalation.title,
    expires_at: expiresAt.toISOString(),
    recommended_action,
  });
}
