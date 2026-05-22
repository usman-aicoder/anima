import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import {
  GrowthAgent,
  StrategyAgent,
  OperationsAgent,
  QualityAgent,
} from '@anima/agents';
import type { AgentQueueName, AgentJobPayload } from './queues.js';
import { processAgentTasks } from './events.js';

function makeConnection(): Redis {
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  return new Redis(url, { maxRetriesPerRequest: null });
}

function makeAgent(queueName: AgentQueueName, company_name: string) {
  switch (queueName) {
    case 'anima:growth': return new GrowthAgent(company_name);
    case 'anima:strategy': return new StrategyAgent(company_name);
    case 'anima:operations': return new OperationsAgent(company_name);
    case 'anima:quality': return new QualityAgent(company_name);
    case 'anima:finance':
      // Finance agent is Sprint 7 — log and skip
      return null;
  }
}

export function createAgentWorker(queueName: AgentQueueName): Worker<AgentJobPayload> {
  return new Worker<AgentJobPayload>(
    queueName,
    async (job) => {
      const { company_name, mission, goal_id } = job.data;
      console.log(`[${queueName}] Starting: ${mission} (company: ${company_name})`);

      const agent = makeAgent(queueName, company_name);
      if (!agent) {
        console.warn(`[${queueName}] No agent implementation yet — skipping`);
        return;
      }

      await agent.run(mission, goal_id);

      // After each agent run, dispatch any pending agent tasks written to the World Model
      await processAgentTasks(company_name);

      console.log(`[${queueName}] Completed: ${mission}`);
    },
    {
      connection: makeConnection(),
      concurrency: 1, // one mission at a time per agent
    },
  );
}
