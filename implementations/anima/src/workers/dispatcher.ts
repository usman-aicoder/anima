import type { AgentName } from '@anima/core';
import { queues, type AgentQueueName, type AgentJobPayload } from './queues.js';

const AGENT_QUEUE_MAP: Record<AgentName, AgentQueueName> = {
  growth: 'anima-growth',
  strategy: 'anima-strategy',
  operations: 'anima-operations',
  finance: 'anima-finance',
  quality: 'anima-quality',
};

export async function dispatchMission(
  agent: AgentName,
  payload: AgentJobPayload,
  opts: { delay?: number; jobId?: string } = {},
): Promise<string> {
  const queueName = AGENT_QUEUE_MAP[agent];
  const queue = queues[queueName];
  const job = await queue.add(payload.mission, payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    ...(opts.jobId !== undefined ? { jobId: opts.jobId } : {}),
    ...(opts.delay !== undefined ? { delay: opts.delay } : {}),
  });
  return job.id ?? 'unknown';
}
