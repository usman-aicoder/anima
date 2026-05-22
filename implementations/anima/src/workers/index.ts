import { queues, type AgentQueueName } from './queues.js';
import { createAgentWorker } from './agent-worker.js';

const QUEUE_NAMES: AgentQueueName[] = [
  'anima:growth',
  'anima:strategy',
  'anima:operations',
  'anima:finance',
  'anima:quality',
];

// Quality Agent runs on a schedule: every 30 minutes (configurable via
// company_wiki.strategy_agent_interval, but we seed with the default here).
const QUALITY_INTERVAL_MS = 30 * 60 * 1000;

export async function startWorkers(company_name: string): Promise<void> {
  // Start a worker for each agent queue
  for (const queueName of QUEUE_NAMES) {
    const worker = createAgentWorker(queueName);
    worker.on('failed', (job, err) => {
      console.error(`[${queueName}] Job failed: ${job?.name ?? 'unknown'} — ${err.message}`);
    });
  }

  // Register Quality Agent as a repeatable job
  const qualityQueue = queues['anima:quality'];
  await qualityQueue.add(
    'quality-monitor',
    { company_name, mission: 'Run threshold checks and goal health monitoring.' },
    {
      repeat: { every: QUALITY_INTERVAL_MS },
      jobId: `quality-monitor-${company_name}`,
    },
  );

  console.log(`[workers] All 5 agent workers started. Quality monitor every 30min.`);
}

export { dispatchMission } from './dispatcher.js';
export { processAgentTasks } from './events.js';
