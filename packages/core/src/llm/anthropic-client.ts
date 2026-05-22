import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import type { LLMClient, LLMResponse, NormalizedBlock } from './types.js';

export class AnthropicLLMClient implements LLMClient {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  }

  async complete(params: {
    model: string;
    max_tokens: number;
    system: string;
    tools: Tool[];
    messages: MessageParam[];
  }): Promise<LLMResponse> {
    const response = await this.client.messages.create(params);

    const content: NormalizedBlock[] = response.content.flatMap((b): NormalizedBlock[] => {
      if (b.type === 'text') return [{ type: 'text', text: b.text }];
      if (b.type === 'tool_use') {
        return [{ type: 'tool_use', id: b.id, name: b.name, input: b.input as Record<string, unknown> }];
      }
      return [];
    });

    const stop_reason =
      response.stop_reason === 'tool_use' ? 'tool_use'
      : response.stop_reason === 'max_tokens' ? 'max_tokens'
      : 'end_turn';

    return {
      stop_reason,
      content,
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    };
  }

  async summarize(params: { model: string; max_tokens: number; prompt: string }): Promise<string> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: [{ role: 'user', content: params.prompt }],
    });
    const block = response.content.find((b) => b.type === 'text');
    return block?.type === 'text' ? block.text : 'Previous conversation history compacted.';
  }
}
