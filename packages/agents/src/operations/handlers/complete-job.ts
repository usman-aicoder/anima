import { WorldModelClient } from '@anima/core';

export async function completeJob(
  _company_name: string,
  job_id: string,
  actual_hours: number,
  quality_rating: number,
): Promise<string> {
  if (quality_rating < 1 || quality_rating > 5) {
    return `Invalid quality_rating ${quality_rating}. Must be 1-5.`;
  }

  const job = await WorldModelClient.jobs.findById(job_id);
  if (!job) return `Job ${job_id} not found.`;
  if (job.status !== 'assigned') {
    return `Job ${job_id} is in status '${job.status}', expected 'assigned'.`;
  }

  const completed = await WorldModelClient.jobs.complete(job_id, actual_hours, quality_rating);
  if (!completed) return `Failed to complete job ${job_id}.`;

  return JSON.stringify({
    job_id,
    status: 'completed',
    actual_hours,
    quality_rating,
    provider_id: completed.provider_id,
    service_type: completed.service_type,
    note: 'Call update_provider_score next to recalculate provider quality.',
  });
}
