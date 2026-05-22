import { WorldModelClient, Provider } from '@anima/core';

interface ScoreUpdate {
  provider_id: string;
  service_type: string;
  new_score: number;
  jobs_counted: number;
  below_threshold: boolean;
}

// Weighted recalculation: last job = 40%, previous 9 = 60% averaged.
function calcWeightedScore(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  if (ratings.length === 1) return ratings[0] ?? 0;

  const last = ratings[ratings.length - 1] ?? 0;
  const rest = ratings.slice(0, -1);
  const restAvg = rest.reduce((a, b) => a + b, 0) / rest.length;
  return parseFloat((last * 0.4 + restAvg * 0.6).toFixed(2));
}

export async function updateProviderScore(
  _company_name: string,
  provider_id: string,
  service_type: string,
): Promise<string> {
  const provider = await WorldModelClient.providers.findById(provider_id);
  if (!provider) return `Provider ${provider_id} not found.`;

  // Fetch last 10 completed jobs for this provider + service_type
  const allJobs = await WorldModelClient.jobs.find({ provider_id, status: 'completed' });
  const relevant = allJobs
    .filter((j) => j.service_type === service_type && j.quality_rating !== null)
    .sort((a, b) => {
      const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return ta - tb;
    })
    .slice(-10);

  const ratings = relevant.map((j) => j.quality_rating ?? 0);

  // quality_rating is 1-5, normalize to 0-10 for quality_score
  const normalized = ratings.map((r) => r * 2);
  const newScore = calcWeightedScore(normalized);

  // Update the competency entry in the provider document
  const existingComp = provider.competencies.find((c) => c.service_type === service_type);
  const updatedComp = {
    service_type,
    quality_score: newScore,
    job_count: relevant.length,
    avg_response_time_hours: existingComp?.avg_response_time_hours ?? 0,
    last_job_date: relevant[relevant.length - 1]?.completed_at ?? new Date(),
  };

  const otherComps = provider.competencies.filter((c) => c.service_type !== service_type);
  await Provider.findOneAndUpdate(
    { provider_id },
    { competencies: [...otherComps, updatedComp] },
    { new: true },
  );

  const QUALITY_THRESHOLD = 6; // 6/10 = 3/5 stars
  const result: ScoreUpdate = {
    provider_id,
    service_type,
    new_score: newScore,
    jobs_counted: relevant.length,
    below_threshold: newScore < QUALITY_THRESHOLD,
  };

  return JSON.stringify(result, null, 2);
}
