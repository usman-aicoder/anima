import { WorldModelClient } from '../world-model-client.js';
import {
  Goal,
  Task,
  Provider,
  CompanyWiki,
  QualityConfig,
  DEFAULT_QUALITY_CONFIGS,
} from '../index.js';
import type {
  IGoal,
  ITask,
  IProvider,
  ICompanyWiki,
  IAgentDecision,
  IQualityConfig,
} from '../index.js';

export interface CompanySnapshot {
  version: '1';
  exported_at: string;
  company_name: string;
  company_wiki: ICompanyWiki[];
  goals: IGoal[];
  tasks: ITask[];
  agent_decisions: IAgentDecision[]; // last 200
  providers: IProvider[];
  quality_config: IQualityConfig[];
}

export async function exportCompany(company_name: string): Promise<CompanySnapshot> {
  const [wikiEntries, goals, tasks, providers, decisions, qualityConfigs] = await Promise.all([
    WorldModelClient.companyWiki.getAll(company_name),
    Goal.find().lean<IGoal[]>().exec(),
    Task.find().lean<ITask[]>().exec(),
    Provider.find().lean<IProvider[]>().exec(),
    WorldModelClient.agentDecisions.findRecent('strategy', 200),
    QualityConfig.find().lean<IQualityConfig[]>().exec(),
  ]);

  // Pull decisions for all agents (strategy query is just one — gather all here)
  const allDecisions: IAgentDecision[] = [];
  const agents = ['growth', 'operations', 'finance', 'strategy', 'quality'] as const;
  for (const agent of agents) {
    const d = await WorldModelClient.agentDecisions.findRecent(agent, 40);
    allDecisions.push(...d);
  }
  // Sort by created_at desc, keep last 200
  allDecisions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    version: '1',
    exported_at: new Date().toISOString(),
    company_name,
    company_wiki: wikiEntries,
    goals,
    tasks,
    agent_decisions: allDecisions.slice(0, 200),
    providers,
    quality_config: qualityConfigs.length > 0 ? qualityConfigs : (DEFAULT_QUALITY_CONFIGS as unknown as IQualityConfig[]),
  };
}

export async function importCompany(snapshot: CompanySnapshot): Promise<{ imported: Record<string, number> }> {
  const counts: Record<string, number> = {
    company_wiki: 0,
    goals: 0,
    tasks: 0,
    providers: 0,
    quality_config: 0,
  };

  // company_wiki — upsert by (company_name, category, key)
  for (const entry of snapshot.company_wiki) {
    await WorldModelClient.companyWiki.set(
      entry.company_name,
      entry.category,
      entry.key,
      entry.value,
      `import:${snapshot.exported_at}`,
    );
    counts['company_wiki']!++;
  }

  // goals — upsert by goal_id
  for (const goal of snapshot.goals) {
    await Goal.findOneAndUpdate(
      { goal_id: goal.goal_id },
      goal,
      { upsert: true, new: true },
    );
    counts['goals']!++;
  }

  // tasks — upsert by task_id
  for (const task of snapshot.tasks) {
    await Task.findOneAndUpdate(
      { task_id: task.task_id },
      task,
      { upsert: true, new: true },
    );
    counts['tasks']!++;
  }

  // providers — upsert by provider_id
  for (const provider of snapshot.providers) {
    await Provider.findOneAndUpdate(
      { provider_id: provider.provider_id },
      provider,
      { upsert: true, new: true },
    );
    counts['providers']!++;
  }

  // quality_config — upsert by agent
  for (const config of snapshot.quality_config) {
    await QualityConfig.findOneAndUpdate(
      { agent: config.agent },
      config,
      { upsert: true, new: true },
    );
    counts['quality_config']!++;
  }

  // agent_decisions are append-only — skip on import (they are historical,
  // importing them risks duplicate decision_ids in a new instance)

  return { imported: counts };
}
