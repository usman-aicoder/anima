import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js';

export type { Tool, MessageParam };

export interface NormalizedTextBlock {
  type: 'text';
  text: string;
}

export interface NormalizedToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type NormalizedBlock = NormalizedTextBlock | NormalizedToolUseBlock;

export interface LLMResponse {
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
  content: NormalizedBlock[];
  usage: { input_tokens: number; output_tokens: number };
}

export interface LLMClient {
  complete(params: {
    model: string;
    max_tokens: number;
    system: string;
    tools: Tool[];
    messages: MessageParam[];
  }): Promise<LLMResponse>;

  summarize(params: {
    model: string;
    max_tokens: number;
    prompt: string;
  }): Promise<string>;
}
