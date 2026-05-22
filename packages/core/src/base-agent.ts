import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages.js';
import { DecisionLogger, type DecisionEntry } from './decision-logger.js';
import { SessionManager } from './session-manager.js';
import { WorldModelClient } from './world-model-client.js';
import { compactMessages } from './harness/compaction.js';
import type { AgentName } from './db/models/agent-decision.model.js';
import type { IGoal } from './db/models/goal.model.js';

// 80% of the default max_tokens_per_session threshold (80 000).
// When accumulated input tokens across iterations exceed this, compact messages.
const COMPACTION_THRESHOLD = 64_000;

export interface AgentContext {
  goals: IGoal[];
  company_wiki: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ActionRequest {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface ActionResult {
  tool_name: string;
  output: string;
  world_model_update: Record<string, unknown>;
}

export interface PreHookResult {
  allowed: boolean;
  reason?: string;
  escalation_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseAgent — extend this for each domain agent.
//
// Prompt assembly order (mandatory for prefix cache):
//   1. Static system context  ← CLAUDE.md + AGENTS.md content (never changes)
//   2. Dynamic world model    ← current goals, wiki, agent-specific reads (always last)
//
// Subclasses implement:
//   getAgentName()    — which agent this is
//   getIterationCap() — max iterations per session (from AGENTS.md)
//   getTools()        — MCP tools this agent exposes
//   assembleContext() — which World Model fields to read at session start
//   getStaticPrompt() — content of AGENTS.md (loaded from file, not inline)
//   preHook()         — permission check before executing a tool
//   executeTool()     — tool implementation
//   postHook()        — World Model writes + decision log flush
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BaseAgent {
  protected readonly client: Anthropic;
  protected readonly logger: DecisionLogger;
  protected readonly sessions: SessionManager;
  protected readonly wm: typeof WorldModelClient;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env['ANTHROPIC_API_KEY'],
    });
    this.logger = new DecisionLogger();
    this.sessions = new SessionManager();
    this.wm = WorldModelClient;
  }

  abstract getAgentName(): AgentName;
  abstract getIterationCap(): number;
  abstract getTools(): Tool[];
  abstract assembleContext(): Promise<AgentContext>;
  abstract getStaticPrompt(): string;
  abstract preHook(action: ActionRequest): Promise<PreHookResult>;
  abstract executeTool(action: ActionRequest, context: AgentContext): Promise<ActionResult>;
  abstract postHook(result: ActionResult, session_id: string, context: AgentContext): Promise<void>;

  async run(mission: string, goal_id?: string): Promise<void> {
    const context = await this.assembleContext();
    const session = await this.sessions.create({
      agent: this.getAgentName(),
      mission,
      goal_id: goal_id ?? null,
      iteration_cap: this.getIterationCap(),
      context_snapshot: context as unknown as Record<string, unknown>,
    });

    const messages: MessageParam[] = [];
    let iteration = 0;
    let accumulatedInputTokens = 0;

    try {
      while (iteration < this.getIterationCap()) {
        iteration++;

        // 1. Assemble prompt — static first (prefix cache), dynamic World Model last
        const system = this.buildSystemPrompt(context);

        // 2. Add mission as first user turn if starting
        if (messages.length === 0) {
          messages.push({ role: 'user', content: mission });
        }

        // 3. Call Claude API
        const response = await this.client.messages.create({
          model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
          max_tokens: 4096,
          system,
          tools: this.getTools(),
          messages,
        });

        // 4. Accumulate tokens and compact if approaching limit
        accumulatedInputTokens += response.usage.input_tokens;
        if (accumulatedInputTokens > COMPACTION_THRESHOLD && messages.length > 2) {
          const compacted = await compactMessages(messages, this.client);
          messages.length = 0;
          messages.push(...compacted);
          accumulatedInputTokens = 0;
        }

        // 5. Checkpoint conversation state
        await this.sessions.checkpoint(
          session.session_id,
          { messages, iteration } as Record<string, unknown>,
          iteration,
        );

        // 6. Check terminal state — end_turn or no tool use
        if (response.stop_reason === 'end_turn') {
          const textContent = response.content.find((b) => b.type === 'text');
          if (textContent && textContent.type === 'text') {
            await this.logger.log({
              session_id: session.session_id,
              agent: this.getAgentName(),
              decision_type: 'mission_complete',
              input_signal: mission,
              decision: 'mission completed',
              reasoning: textContent.text,
              output: textContent.text,
              token_usage: this.extractTokenUsage(response.usage),
            });
          }
          break;
        }

        // 7. Process tool use blocks
        const toolUseBlocks = response.content.filter(
          (b): b is ToolUseBlock => b.type === 'tool_use',
        );

        if (toolUseBlocks.length === 0) break;

        // Add assistant turn to messages
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: MessageParam['content'] = [];

        for (const toolUse of toolUseBlocks) {
          const action: ActionRequest = {
            tool_name: toolUse.name,
            tool_input: toolUse.input as Record<string, unknown>,
          };

          // 8. Pre-hook — permission check
          const permission = await this.preHook(action);

          if (!permission.allowed) {
            // Log escalation and surface result to model
            await this.logger.log({
              session_id: session.session_id,
              agent: this.getAgentName(),
              decision_type: 'tool_blocked',
              input_signal: JSON.stringify(action),
              decision: 'blocked by pre-hook',
              reasoning: permission.reason ?? 'permission denied',
              output: 'escalated',
              escalated_to_human: true,
              token_usage: this.extractTokenUsage(response.usage),
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Action blocked: ${permission.reason ?? 'requires human approval'}`,
            });
            continue;
          }

          // 9. Execute tool
          const result = await this.executeTool(action, context);

          // 10. Post-hook — World Model write + decision log (atomic flush)
          await this.postHook(result, session.session_id, context);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result.output,
          });
        }

        // Add tool results as user turn
        messages.push({ role: 'user', content: toolResults });
      }

      await this.sessions.complete(session.session_id);
    } catch (err) {
      await this.sessions.fail(session.session_id, true);
      throw err;
    }
  }

  // Static segments first — prefix cache stable across iterations
  private buildSystemPrompt(context: AgentContext): string {
    return [
      this.getStaticPrompt(),
      '---',
      '## Current World Model Context',
      JSON.stringify(context, null, 2),
    ].join('\n\n');
  }

  private extractTokenUsage(usage: {
    input_tokens: number;
    output_tokens: number;
  }): { input_tokens: number; output_tokens: number; cost_sek: number } {
    // Cost estimate: Sonnet input ~$3/MTok, output ~$15/MTok → convert to SEK (~10 SEK/USD)
    const cost_usd =
      (usage.input_tokens / 1_000_000) * 3 + (usage.output_tokens / 1_000_000) * 15;
    return {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_sek: parseFloat((cost_usd * 10).toFixed(4)),
    };
  }
}
