import { AgentSession, type IAgentSession } from './db/models/agent-session.model.js';

export class SessionManager {
  async create(params: {
    agent: string;
    mission: string;
    goal_id?: string | null;
    iteration_cap?: number;
    context_snapshot?: Record<string, unknown>;
  }): Promise<IAgentSession> {
    return AgentSession.create({
      agent: params.agent,
      mission: params.mission,
      goal_id: params.goal_id ?? null,
      iteration_cap: params.iteration_cap ?? 20,
      context_snapshot: params.context_snapshot ?? {},
      status: 'running',
      started_at: new Date(),
      last_checkpoint_at: new Date(),
    });
  }

  async checkpoint(
    session_id: string,
    conversation_state: Record<string, unknown>,
    iteration_count: number,
  ): Promise<void> {
    await AgentSession.updateOne(
      { session_id },
      {
        conversation_state,
        iteration_count,
        last_checkpoint_at: new Date(),
      },
    );
  }

  async complete(session_id: string): Promise<void> {
    await AgentSession.updateOne(
      { session_id },
      { status: 'completed', ended_at: new Date() },
    );
  }

  async fail(session_id: string, crashed = false): Promise<void> {
    await AgentSession.updateOne(
      { session_id },
      { status: crashed ? 'crashed' : 'failed', ended_at: new Date() },
    );
  }

  async waitingApproval(session_id: string): Promise<void> {
    await AgentSession.updateOne({ session_id }, { status: 'waiting_approval' });
  }

  async resume(session_id: string): Promise<void> {
    await AgentSession.updateOne({ session_id }, { status: 'running' });
  }

  findById(session_id: string): Promise<IAgentSession | null> {
    return AgentSession.findOne({ session_id }).lean<IAgentSession>().exec();
  }

  findCrashed(agent: string): Promise<IAgentSession[]> {
    return AgentSession.find({ agent, status: 'crashed' })
      .sort({ last_checkpoint_at: -1 })
      .lean<IAgentSession[]>()
      .exec();
  }
}
