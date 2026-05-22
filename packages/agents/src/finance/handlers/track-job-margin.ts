import { WorldModelClient } from '@anima/core';

interface MarginEntry {
  job_id: string;
  service_type: string;
  geography: string;
  revenue: number;
  labor_cost: number;
  margin: number;
  margin_pct: number;
  recorded_at: string;
}

interface MarginByService {
  [service_type: string]: {
    total_revenue: number;
    total_labor_cost: number;
    total_margin: number;
    job_count: number;
    avg_margin_pct: number;
    last_updated: string;
  };
}

export async function trackJobMargin(
  company_name: string,
  job_id: string,
): Promise<string> {
  const job = await WorldModelClient.jobs.findById(job_id);
  if (!job) return `Job ${job_id} not found.`;
  if (job.net_customer_payment === 0) {
    return `Job ${job_id} has no net_customer_payment set. Run generate_invoice first.`;
  }

  const margin = parseFloat(
    (job.net_customer_payment - job.labor_cost).toFixed(2),
  );
  const marginPct =
    job.net_customer_payment > 0
      ? parseFloat(((margin / job.net_customer_payment) * 100).toFixed(1))
      : 0;

  const entry: MarginEntry = {
    job_id,
    service_type: job.service_type,
    geography: job.geography,
    revenue: job.net_customer_payment,
    labor_cost: job.labor_cost,
    margin,
    margin_pct: marginPct,
    recorded_at: new Date().toISOString(),
  };

  // Read existing margin_by_service and update
  const existing = await WorldModelClient.companyWiki.getTyped<MarginByService>(
    company_name,
    'finance',
    'margin_by_service',
  );

  const current: MarginByService = existing ?? {};
  const svc = current[job.service_type] ?? {
    total_revenue: 0,
    total_labor_cost: 0,
    total_margin: 0,
    job_count: 0,
    avg_margin_pct: 0,
    last_updated: '',
  };

  svc.total_revenue = parseFloat((svc.total_revenue + job.net_customer_payment).toFixed(2));
  svc.total_labor_cost = parseFloat((svc.total_labor_cost + job.labor_cost).toFixed(2));
  svc.total_margin = parseFloat((svc.total_margin + margin).toFixed(2));
  svc.job_count += 1;
  svc.avg_margin_pct = parseFloat(
    ((svc.total_margin / svc.total_revenue) * 100).toFixed(1),
  );
  svc.last_updated = new Date().toISOString();

  current[job.service_type] = svc;

  await WorldModelClient.companyWiki.set(
    company_name,
    'finance',
    'margin_by_service',
    current,
    'finance-agent',
  );

  return JSON.stringify({ job: entry, updated_service: job.service_type, totals: svc }, null, 2);
}
