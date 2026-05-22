import { WorldModelClient } from '@anima/core';

interface AssignmentResult {
  job_id: string;
  assigned_provider_id: string;
  provider_name: string;
  quality_score: number;
  reason: string;
}

export async function assignJob(
  _company_name: string,
  job_id: string,
): Promise<string> {
  const job = await WorldModelClient.jobs.findById(job_id);
  if (!job) return `Job ${job_id} not found.`;
  if (job.status !== 'requested') {
    return `Job ${job_id} is in status '${job.status}', expected 'requested'.`;
  }

  // Find active providers who cover this geography
  const candidates = await WorldModelClient.providers.find({ status: 'active', active: true });

  // Score: find their competency score for this service_type
  const scored = candidates
    .map((p) => {
      const comp = p.competencies.find((c) => c.service_type === job.service_type);
      const coversGeo = p.geographic_coverage.some(
        (g) => job.geography.toLowerCase().includes(g.city.toLowerCase()),
      );
      return {
        provider: p,
        score: comp?.quality_score ?? 0,
        coversGeo,
      };
    })
    .filter((p) => p.coversGeo && p.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return `No eligible active providers found for job ${job_id} (service: ${job.service_type}, geography: ${job.geography}).`;
  }

  const best = scored[0];
  if (!best) return `No eligible providers found for job ${job_id}.`;

  await WorldModelClient.jobs.assign(job_id, best.provider.provider_id);

  const result: AssignmentResult = {
    job_id,
    assigned_provider_id: best.provider.provider_id,
    provider_name: best.provider.company_name,
    quality_score: best.score,
    reason: `Highest quality score (${best.score}/10) among ${scored.length} eligible providers for ${job.service_type} in ${job.geography}.`,
  };

  return JSON.stringify(result, null, 2);
}
