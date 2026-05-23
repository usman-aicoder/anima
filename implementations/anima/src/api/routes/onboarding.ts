import type { FastifyInstance } from 'fastify';
import { runIntake } from '@anima/agents';
import type { IntakeAnswer } from '@anima/agents';
import { dispatchMission } from '../../workers/index.js';
import type { AgentName } from '@anima/core';

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  // Run the 10-question intake synchronously — user waits for completion.
  // After facts are written, dispatches a Strategy Agent mission to build the goal tree.
  app.post<{
    Body: { company_name: string; answers: IntakeAnswer[] };
  }>('/onboarding/run', async (request, reply) => {
    const { company_name, answers } = request.body;

    if (!company_name || !answers?.length) {
      return reply.code(400).send({ error: 'company_name and answers are required' });
    }

    const result = await runIntake(answers);

    // Dispatch goal-tree + human task generation to Strategy Agent
    await dispatchMission(
      'strategy',
      {
        company_name: result.company_name,
        mission: `Onboarding complete for ${result.company_name}. Build the goal tree using build_goal_tree, then generate human tasks using generate_human_tasks. Use the facts already written to company_wiki.`,
      },
      { jobId: `onboarding-goal-tree-${result.company_name}` },
    );

    return reply.send({
      company_name: result.company_name,
      facts_written: result.facts_written.length,
      goal_tree_queued: true,
      message: `Intake complete. ${result.facts_written.length} facts written to World Model. Goal tree is being built — check Goals page in ~30 seconds.`,
    });
  });

  // Generic mission dispatch — trigger any agent from the dashboard or external tools.
  app.post<{
    Body: { agent: AgentName; mission: string; company_name: string; goal_id?: string };
  }>('/dispatch', async (request, reply) => {
    const { agent, mission, company_name, goal_id } = request.body;

    if (!agent || !mission || !company_name) {
      return reply.code(400).send({ error: 'agent, mission, and company_name are required' });
    }

    const jobId = await dispatchMission(
      agent,
      { company_name, mission, ...(goal_id !== undefined ? { goal_id } : {}) },
    );

    return reply.send({ queued: true, job_id: jobId, agent, mission });
  });
}
