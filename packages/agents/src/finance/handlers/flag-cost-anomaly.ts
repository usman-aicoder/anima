import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient } from '@anima/core';

const ANOMALY_THRESHOLD = 1.2; // 20% over estimated
const SEVERE_THRESHOLD = 1.5;  // 50% over — requires immediate escalation

export async function flagCostAnomaly(
  _company_name: string,
  job_id: string,
): Promise<string> {
  const job = await WorldModelClient.jobs.findById(job_id);
  if (!job) return `Job ${job_id} not found.`;

  if (job.actual_hours === null || job.estimated_hours === 0) {
    return `Job ${job_id} missing actual_hours or estimated_hours — cannot check anomaly.`;
  }

  const ratio = job.actual_hours / job.estimated_hours;
  if (ratio <= ANOMALY_THRESHOLD) {
    return JSON.stringify({
      job_id,
      ratio: ratio.toFixed(2),
      anomaly: false,
      message: `Actual hours (${job.actual_hours}) within 20% of estimate (${job.estimated_hours}). No anomaly.`,
    });
  }

  const isSevere = ratio > SEVERE_THRESHOLD;
  const severity = isSevere ? 'critical' : 'warning';
  const overPct = Math.round((ratio - 1) * 100);

  // Create quality alert
  const alert = await WorldModelClient.qualityAlerts.create({
    alert_id: uuidv4(),
    agent: 'finance',
    alert_type: 'unusual_decision',
    severity,
    threshold_value: job.estimated_hours,
    actual_value: job.actual_hours,
    message: `Job ${job_id} (${job.service_type}): actual hours ${job.actual_hours} vs estimated ${job.estimated_hours} — ${overPct}% over.`,
    resolved: false,
    resolved_at: null,
    created_at: new Date(),
  });

  // Escalate severe anomalies to human proxy
  let escalation_id: string | null = null;
  if (isSevere) {
    const escalation = await WorldModelClient.escalations.create({
      escalation_id: uuidv4(),
      agent: 'finance',
      type: 'unusual_decision',
      title: `Severe cost overrun: Job ${job_id} — ${overPct}% over estimate`,
      context: {
        job_id,
        service_type: job.service_type,
        estimated_hours: job.estimated_hours,
        actual_hours: job.actual_hours,
        labor_cost: job.labor_cost,
        ratio,
      },
      recommended_action: `Review job ${job_id}. Consider whether provider pricing needs adjustment or the estimate was unrealistic.`,
      status: 'pending',
      decision_by: null,
      decision_reason: null,
      decided_at: null,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });
    escalation_id = escalation.escalation_id;
  }

  return JSON.stringify({
    job_id,
    ratio: ratio.toFixed(2),
    over_pct: overPct,
    anomaly: true,
    severity,
    alert_id: alert.alert_id,
    escalation_id,
    message: `Cost anomaly flagged: ${overPct}% over estimate.`,
  }, null, 2);
}
