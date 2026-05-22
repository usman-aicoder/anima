import { AgentDecision, type IAgentDecision, type AgentName } from './db/models/agent-decision.model.js';

export interface DecisionEntry {
  session_id: string;
  agent: AgentName;
  decision_type: string;
  input_signal: string;
  decision: string;
  reasoning: string;
  output: string;
  world_model_update?: Record<string, unknown>;
  escalated_to_human?: boolean;
  human_decision?: string | null;
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    cost_sek: number;
  };
}

export class DecisionLogger {
  // Append-only. One public method. writeConcern majority is set at connection level.
  async log(entry: DecisionEntry): Promise<IAgentDecision> {
    return AgentDecision.create({
      session_id: entry.session_id,
      agent: entry.agent,
      decision_type: entry.decision_type,
      input_signal: entry.input_signal,
      decision: entry.decision,
      reasoning: entry.reasoning,
      output: entry.output,
      world_model_update: entry.world_model_update ?? {},
      escalated_to_human: entry.escalated_to_human ?? false,
      human_decision: entry.human_decision ?? null,
      token_usage: entry.token_usage ?? { input_tokens: 0, output_tokens: 0, cost_sek: 0 },
      created_at: new Date(),
    });
  }
}
