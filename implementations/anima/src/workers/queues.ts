import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export interface AgentJobPayload {
  company_name: string;
  mission: string;
  goal_id?: string;
}

export type AgentQueueName =
  | 'anima:growth'
  | 'anima:strategy'
  | 'anima:operations'
  | 'anima:finance'
  | 'anima:quality';

function makeConnection(): Redis {
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  return new Redis(url, { maxRetriesPerRequest: null });
}

function makeQueue(name: AgentQueueName): Queue<AgentJobPayload> {
  return new Queue<AgentJobPayload>(name, { connection: makeConnection() });
}

export const queues: Record<AgentQueueName, Queue<AgentJobPayload>> = {
  'anima:growth': makeQueue('anima:growth'),
  'anima:strategy': makeQueue('anima:strategy'),
  'anima:operations': makeQueue('anima:operations'),
  'anima:finance': makeQueue('anima:finance'),
  'anima:quality': makeQueue('anima:quality'),
};
